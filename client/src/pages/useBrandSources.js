import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
export function nativeRecordRows(data,label='records') {
  const rows=Array.isArray(data)?data:data?.data;
  if(!Array.isArray(rows)||rows.some(row=>!row||!Number.isSafeInteger(Number(row.id))||Number(row.id)<=0))throw Error('The native '+label+' response was malformed. Retry the actual list.');
  return rows;
}
export default function useBrandSources(config) {
  const needsProfiles=Boolean(config?.fields?.some(field=>field.optionsFrom==='brand-profiles'));
  const needsContent=Boolean(config?.fields?.some(field=>field.optionsFrom==='content-analysis'));
  const [state,setState]=useState({loading:false,error:'',records:{'brand-profiles':[],'content-analysis':[]}}),[version,setVersion]=useState(0);
  const retry=useCallback(()=>setVersion(value=>value+1),[]);
  useEffect(()=>{const controller=new AbortController();if(!needsProfiles&&!needsContent){setState({loading:false,error:'',records:{'brand-profiles':[],'content-analysis':[]}});return()=>controller.abort();}setState(prior=>({...prior,loading:true,error:''}));Promise.all([needsProfiles?axios.get('/api/brand-profiles?limit=100',{signal:controller.signal}).then(res=>nativeRecordRows(res.data,'brand profiles')):[],needsContent?axios.get('/api/content-analysis?limit=100',{signal:controller.signal}).then(res=>nativeRecordRows(res.data,'content records')):[]]).then(([profiles,content])=>{if(!controller.signal.aborted)setState({loading:false,error:'',records:{'brand-profiles':profiles,'content-analysis':content}});}).catch(failure=>{if(!controller.signal.aborted)setState({loading:false,error:'Actual source records could not be loaded: '+(failure.response?.data?.error||failure.message),records:{'brand-profiles':[],'content-analysis':[]}});});return()=>controller.abort();},[needsProfiles,needsContent,version]);return {...state,retry,needsProfiles,needsContent};
}
