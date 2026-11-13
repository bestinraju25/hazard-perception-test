/* HPT shared scoring rules and constructive feedback. Keep this file loaded before app.js and hpt-report.js. */
(function(){
  'use strict';
  function marksForReaction(delaySeconds, maximumMarks){
    const max=Math.max(0,Number(maximumMarks)||0);
    const delay=Math.max(0,Number(delaySeconds)||0);
    let penalty=0;
    if(delay<=0.5) penalty=0;
    else if(delay<=1) penalty=2*(delay-0.5);
    else penalty=1+3*(delay-1);
    return Math.max(0,Math.min(max,Math.round(max-penalty)));
  }
  function hazardFeedback(row){
    if(!row?.identified){
      return {level:'missed',title:'Keep learning — this hazard was missed',message:'This developing hazard was not identified in time. Practise scanning further ahead, watching the road edges and noticing changes in pedestrian and vehicle movement. Every review helps build safer observation habits.'};
    }
    const delay=Math.max(0,Number(row.delay)||0);
    if(delay<=0.5)return {level:'excellent',title:'Excellent anticipation!',message:'You recognised this developing hazard very quickly. That is the kind of early observation that supports safer driving. Keep scanning ahead and maintain this consistency.'};
    if(delay<=1)return {level:'good',title:'Good observation!',message:'You identified the hazard with a good response. A little earlier recognition can make your reaction even safer. Keep watching for early warning signs.'};
    if(delay<=2)return {level:'improve',title:'Good identification — improve timing',message:'You spotted the hazard, but your response came after it had already developed. Try to anticipate what other road users may do next, rather than waiting for the danger to become obvious.'};
    return {level:'late',title:'Work on earlier hazard recognition',message:'You did identify the hazard, but the response was delayed. Look further ahead, check the sides of the road and watch for changes in traffic behaviour so you can react sooner next time.'};
  }
  function overallFeedback(score,identified,total,averageDelay){
    const s=Number(score)||0,hit=Number(identified)||0,all=Number(total)||0,missed=Math.max(0,all-hit);
    let title,message,level;
    if(s>=90){level='excellent';title='Outstanding hazard awareness';message=`Excellent work. You identified ${hit} of ${all} official hazards. Your performance shows strong observation. Keep practising to maintain this standard.`;}
    else if(s>=85){level='excellent';title='Excellent performance';message=`Very good hazard awareness. You identified ${hit} of ${all} official hazards. Continue scanning well ahead and anticipating developing situations.`;}
    else if(s>=60){level='good';title='Congratulations — examination standard met';message=`You achieved the pass mark and identified ${hit} of ${all} official hazards. Review the delayed or missed hazards below to make your reactions even earlier.`;}
    else{level='improve';title='Keep practising — improvement is within reach';message=`You identified ${hit} of ${all} official hazards and missed ${missed}. Review the examples below, practise scanning ahead and look for early clues before a hazard fully develops.`;}
    if(Number.isFinite(Number(averageDelay)))message+=` Your average reaction delay on identified hazards was ${Number(averageDelay).toFixed(2)} seconds.`;
    return {level,title,message};
  }
  window.HPTScoring={marksForReaction,hazardFeedback,overallFeedback};
})();
