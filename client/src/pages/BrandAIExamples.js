// Fictional writing exercises only. Real record choices are loaded separately.
const brief = [
  {title:'Fictional launch draft',content:'Fictional writing exercise: Meet a new planning notebook. Keep your weekly priorities clear, review the details, and choose the next useful step.',channel:'website',industry:'Fictional stationery',tone:'professional',days:0},
  {title:'Fictional support reply',content:'Fictional writing exercise: We understand that a delayed parcel is frustrating. Please review the available support options; a team member can confirm the next step.',channel:'email',industry:'Fictional retail support',tone:'empathetic',days:14},
  {title:'Fictional community update',content:'Fictional writing exercise: Join a neighborhood sketching session this weekend. Bring your ideas, ask questions, and help us plan a welcoming event.',channel:'social_media',industry:'Fictional community arts',tone:'warm',days:30},
];
export const brandChoiceLabels = ['Launch draft', 'Support reply', 'Community update'];
export function declaredBrandExamples(config) {
  return brief.map((b,index) => {
    const sample = {title:b.title,content:b.content,original_content:b.content,source_content:b.content,sample_content:b.content,competitor_name:`Fictional comparison brand ${index+1}`,industry:b.industry,channel:b.channel,window_days:b.days,expected_tone:b.tone,desired_tone:b.tone,submitter_role:'contributor',content_samples:b.content,
      baseline_samples:`Fictional baseline: Clear options and helpful explanations.\nFictional baseline: Make space for informed choices.`,recent_samples:b.content,
      historical_samples:'Fictional heritage exercise: Useful tools, patient explanations, and clear choices.\nFictional heritage exercise: Build trust through clear information.',current_samples:b.content,our_brand_samples:b.content,
      competitors:JSON.stringify([{name:`Fictional comparison brand ${index+1}`,samples:[b.content,'Fictional comparison sentence: Practical choices with clear limits.']}],null,2),
      tones:[['professional','warm'],['empathetic','informative'],['warm','playful']][index].join(', '),channels:[['website','email'],['support','email'],['social_media','blog']][index].join(', '),
      brand_voice:['Fictional exercise: clear, practical, welcoming.','Fictional exercise: empathetic, patient, transparent.','Fictional exercise: warm, collaborative, informative.'][index],competitor_url:`Fictional comparison brand ${index+1}`,
      context:JSON.stringify({content:b.content,brand_voice:'Fictional voice: clear, practical, welcoming.',audience:'Fictional writing workshop participants',constraints:['Use only the supplied hypothetical text.','Identify missing source information; do not claim retrieval, deployment, monitoring or approval.'],optional_context:{channel:b.channel,window_days:b.days,notes:'Hypothetical planning context; no external system or published content is accessed.'}},null,2)
    };
    const out={};for(const field of config.fields){if(field.optionsFrom)continue;let value=sample[field.name];if(field.options){const opts=field.options.filter(option=>(typeof option==='object'?option.value:option)!=='');if(!opts.length)throw Error('No native options for '+field.name);value=opts[Math.min(index,opts.length-1)];if(typeof value==='object')value=value.value;}if(field.name==='source_language')value=['English','English','Turkish'][index];if(field.name==='target_language')value=['Spanish','French','English'][index];if(value===undefined)throw Error('Missing declared native example '+config.key+'.'+field.name);out[field.name]=value;}return out;
  });
}
export function fillBrandExample(config,sample,current,sources,index) {
  const out={};for(const field of config.fields){if(field.optionsFrom){const rows=sources[field.optionsFrom]||[],valid=new Set(rows.map(row=>String(row.id)));if(field.type==='multiselect'){const chosen=Array.isArray(current[field.name])?current[field.name].filter(value=>valid.has(String(value))):[];out[field.name]=chosen.length?chosen:rows.slice(index,Math.min(rows.length,index+2)).map(row=>String(row.id));if(!out[field.name].length&&rows.length)out[field.name]=[String(rows[0].id)];}else out[field.name]=valid.has(String(current[field.name]))?current[field.name]:rows.length?String(rows[index%rows.length].id):'';}else out[field.name]=sample[field.name];}return out;
}
export function nativeBrandPayload(config,form) {
  const payload={};for(const field of config.fields){let value=form[field.name];if(value===undefined||value===null||value==='')continue;if(field.type==='number'){value=Number(value);if(!Number.isFinite(value))throw Error(field.label+' must be a number');}else if(field.type==='multiselect')value=value.map(Number);else if(field.optionsFrom)value=Number(value);else if(field.transform==='lines')value=String(value).split('\n').map(v=>v.trim()).filter(Boolean);else if(field.transform==='csv'||field.type==='tags')value=String(value).split(',').map(v=>v.trim()).filter(Boolean);else if(field.transform==='json'){try{value=JSON.parse(value);}catch(_){throw Error(field.label+' must contain valid JSON');}}payload[field.name]=value;}return payload;
}
