import BrandAIHistory from './BrandAIHistory';
import React,{useEffect,useState} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import axios from 'axios';
import {aiToolsConfig} from '../featureConfig';
import AIResultView from './AIResultView';
import useCancelableAI from './useCancelableAI';
import useBrandSources from './useBrandSources';
import BrandExampleButtons from './BrandExampleButtons';
import {nativeBrandPayload} from './BrandAIExamples';
export default function AIToolPage(){
 const {toolKey}=useParams(),navigate=useNavigate(),tool=aiToolsConfig.find(t=>t.key===toolKey);
 const [form,setForm]=useState({}),[allowGeneral,setAllowGeneral]=useState(false),sources=useBrandSources(tool),request=useCancelableAI();
 useEffect(()=>{request.cancel();request.setResult(null);request.setError(null);setForm({});setAllowGeneral(false);},[toolKey]);
 if(!tool)return <p role="alert">AI tool not found. <button onClick={()=>navigate('/')}>Dashboard</button></p>;
 const selected=String(form.brand_profile_id??''),profiles=sources.records['brand-profiles'],invalid=selected&&!profiles.some(row=>String(row.id)===selected),missing=sources.needsProfiles&&!selected&&!allowGeneral||sources.needsContent&&(!Array.isArray(form.content_ids)||!form.content_ids.length);
 const blocked=sources.loading||Boolean(sources.error)||invalid||missing;
 const submit=event=>{event.preventDefault();if(blocked)return;return request.run(async options=>(await axios.post(tool.apiPath,nativeBrandPayload(tool,form),options)).data);};
 return <main style={{padding:24,maxWidth:1100}}><button type="button" style={secondaryButton} onClick={()=>navigate('/')}>Back to Dashboard</button><h1>{tool.title}</h1><p>{tool.description}</p><section style={card}><form onSubmit={submit} aria-label={tool.title}>
 <BrandExampleButtons config={tool} current={form} sources={sources.records} disabled={request.loading||sources.loading||Boolean(sources.error)} onFill={value=>{setForm(value);request.setResult(null);request.setError(null);}}/>
 {sources.loading&&<p role="status">Loading actual accessible source records…</p>}{sources.error&&<p role="alert">{sources.error} <button type="button" onClick={sources.retry}>Retry source records</button></p>}
 {tool.fields.map(field=><label key={field.name} style={{display:'block',marginBottom:14}} htmlFor={'brand-ai-'+field.name}>{field.label}{field.required?' *':' · optional'}{field.type==='select'||field.type==='multiselect'?<select id={'brand-ai-'+field.name} name={field.name} data-ai-field={field.name} multiple={field.type==='multiselect'} value={form[field.name]??(field.type==='multiselect'?[]:'')} onChange={event=>setForm(prior=>({...prior,[field.name]:field.type==='multiselect'?[...event.target.selectedOptions].map(option=>option.value):event.target.value}))} required={field.required} style={input}>{field.type!=='multiselect'&&<option value="">Select actual record…</option>}{(field.optionsFrom?sources.records[field.optionsFrom]:(field.options||[])).map(row=>{const value=field.optionsFrom?row.id:typeof row==='object'?row.value:row;return <option key={value} value={value}>{field.optionsFrom?(row.name||row.title||'Record #'+row.id):typeof row==='object'?row.label:row}</option>;})}</select>:field.type==='textarea'?<textarea id={'brand-ai-'+field.name} name={field.name} data-ai-field={field.name} rows={5} value={form[field.name]??''} onChange={event=>setForm(prior=>({...prior,[field.name]:event.target.value}))} required={field.required} style={input}/>:<input id={'brand-ai-'+field.name} name={field.name} data-ai-field={field.name} type={field.type||'text'} min={field.type==='number'?0:undefined} step={field.type==='number'?1:undefined} value={form[field.name]??''} onChange={event=>setForm(prior=>({...prior,[field.name]:event.target.value}))} required={field.required} style={input}/>}</label>)}
 {sources.needsProfiles&&<><p>Brand profiles are the app’s shared authenticated records; these examples do not create a profile or claim private ownership.</p>{!profiles.length&&!sources.loading&&!sources.error&&<p role="alert">No actual brand profile is available. Create a Brand Profile, retry, or explicitly choose a general review below. The examples cannot fill a nonexistent record.</p>}<label><input type="checkbox" data-ai-exclude="true" checked={allowGeneral} onChange={event=>setAllowGeneral(event.target.checked)}/> I want a general review without a brand profile.</label></>}
 {sources.needsContent&&!sources.loading&&!sources.error&&!sources.records['content-analysis'].length&&<p role="alert">No actual saved content is available. Create content before a batch review. No content ID will be fabricated.</p>}{invalid&&<p role="alert">The chosen brand profile is no longer accessible. Reload and choose an actual record.</p>}
 {request.error&&<p role="alert">{request.error}</p>}{request.notice&&<p role="status">{request.notice}</p>}
 <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}><button type="submit" style={primaryButton} disabled={request.loading||blocked}>{request.loading?'Generating…':'Generate with OpenRouter'}</button>{request.loading&&<button type="button" style={secondaryButton} onClick={request.cancel}>Cancel generation</button>}</div>
 </form></section><AIResultView result={request.result} loading={request.loading} error={request.error} title={tool.title}/><BrandAIHistory config={tool} refresh={request.result} onEdit={value=>{request.cancel();setForm(value);request.setResult(null);}}/></main>;
}
const card={padding:20,border:'1px solid #475569',borderRadius:12,margin:'20px 0'},input={display:'block',width:'100%',boxSizing:'border-box',background:'#0f172a',color:'#f1f5f9',border:'1px solid #64748b',padding:10,borderRadius:8,marginTop:6};

const primaryButton={padding:'11px 16px',borderRadius:8,border:'1px solid #818cf8',background:'#4f46e5',color:'#fff',font:'inherit',fontWeight:700,cursor:'pointer'},secondaryButton={...primaryButton,background:'#1e293b',borderColor:'#64748b'};
