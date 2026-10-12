import React from 'react';
import {brandChoiceLabels,declaredBrandExamples,fillBrandExample} from './BrandAIExamples';
export default function BrandExampleButtons({config,current,sources,onFill,disabled=false}) {
  const choices=declaredBrandExamples(config);
  return <section className="brand-demo-controls" aria-label="Complete AI examples" style={{padding:14,border:'1px solid #475569',borderRadius:10,marginBottom:16}}><strong>Demo AI · Fill the whole active form</strong><p style={{color:'#cbd5e1',fontSize:13}}>Three fictional writing exercises fill required and optional inputs. Actual source choices come from your accessible saved records. Filling an example does not run AI or grant approval.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{choices.map((sample,index)=><button key={index} type="button" disabled={disabled} onClick={()=>onFill(fillBrandExample(config,sample,current,sources,index))} style={{padding:'8px 10px',border:'1px solid #818cf8',borderRadius:8,background:'#312e81',color:'#fff',cursor:'pointer'}}>Demo AI · {brandChoiceLabels[index]}</button>)}</div></section>;
}
