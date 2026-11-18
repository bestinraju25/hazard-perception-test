import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);

  try {
    const { school_id } = await req.json();
    if (typeof school_id !== "string" || !/^[0-9a-f-]{36}$/i.test(school_id)) {
      return json({ ok: false, message: "Invalid registration reference." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublic = Deno.env.get("HPT_VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("HPT_VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("HPT_VAPID_SUBJECT") || "https://www.hazardperceptiontest.co.in/";
    if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate) {
      return json({ ok: false, message: "Push notification secrets are not configured." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Only a real, fresh pending registration can trigger an alert. The one-time claim
    // prevents repeat notifications for the same registration ID.
    const { data: school, error: schoolError } = await admin
      .from("hpt_schools")
      .select("id,school_name,contact_number,location,created_at,registration_status,active,registration_notification_sent_at")
      .eq("id", school_id)
      .eq("registration_status", "pending_approval")
      .eq("active", false)
      .maybeSingle();
    if (schoolError) throw schoolError;
    if (!school) return json({ ok: false, message: "No eligible pending registration was found." }, 404);

    const createdAt = Date.parse(school.created_at || "");
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 30 * 60 * 1000) {
      return json({ ok: false, message: "This registration is outside the notification window." }, 410);
    }
    if (school.registration_notification_sent_at) {
      return json({ ok: true, sent: 0, duplicate: true });
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from("hpt_admin_push_subscriptions")
      .select("endpoint,subscription");
    if (subscriptionsError) throw subscriptionsError;
    if (!subscriptions?.length) return json({ ok: true, sent: 0, message: "No admin devices have enabled notifications yet." });

    const { data: claimed, error: claimError } = await admin
      .from("hpt_schools")
      .update({ registration_notification_sent_at: new Date().toISOString() })
      .eq("id", school_id)
      .eq("registration_status", "pending_approval")
      .eq("active", false)
      .is("registration_notification_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return json({ ok: true, sent: 0, duplicate: true });

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const schoolName = String(school.school_name || "A driving school");
    const payload = JSON.stringify({
      title: "New Driving School Registration",
      body: `${schoolName} has registered and is waiting for your approval.`,
      url: "https://www.hazardperceptiontest.co.in/admin.html?tab=schools",
      tag: `hpt-school-${school.id}`,
    });

    let sent = 0;
    const expired: string[] = [];
    const results = await Promise.allSettled(subscriptions.map(async (row: any) => {
      if (!row.subscription) return;
      try {
        await webpush.sendNotification(row.subscription, payload, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) expired.push(row.endpoint);
        else {
          console.error("Web push delivery failed:", error?.statusCode || error?.message || error);
          throw error;
        }
      }
    }));
    if (expired.length) {
      const { error } = await admin.from("hpt_admin_push_subscriptions").delete().in("endpoint", expired);
      if (error) console.warn("Could not remove expired push endpoints:", error.message);
    }
    const failed = results.filter((result) => result.status === "rejected").length;
    return json({ ok: true, sent, failed, expired: expired.length });
  } catch (error) {
    console.error("HPT registration notification error:", error);
    return json({ ok: false, message: error instanceof Error ? error.message : "Notification could not be sent." }, 500);
  }
});
