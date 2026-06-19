// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { useState, useMemo, useEffect } from "react";

const T = {
  bg:"#1E1530", surface:"#261C3A", card:"#2E2244", cardHov:"#332850",
  border:"#3D2F5A", lime:"#C8F135", white:"#FFFFFF",
  offWhite:"#F0EBF8", muted:"#9B8FBB", ghost:"#6B5F8B", ink:"#1A1025",
  sageBg:"#1A2E1A", sageText:"#7ECB7E", cobaltBg:"#1A2040", cobaltText:"#7EB8F0",
  amberBg:"#2E2010", amberText:"#F0C060", rougeBg:"#2E1010", rougeText:"#F07070",
  profit:"#A8E060", loss:"#F07070",
};
const FB = "'Google Sans','Product Sans',system-ui,sans-serif";
const FD = "'Google Sans','Product Sans',system-ui,sans-serif";

const STLBL = { available:"Available", listed:"Listed", reserved:"Reserved", sold:"Sold" };
const STCOL = {
  available:{ bg:T.sageBg, color:T.sageText },
  listed:{ bg:T.cobaltBg, color:T.cobaltText },
  reserved:{ bg:T.amberBg, color:T.amberText },
  sold:{ bg:T.rougeBg, color:T.rougeText },
};
const PALETTE = ["#C8F135","#A8D020","#7EB8F0","#F0C060","#F07070","#C070F0","#70F0D0","#F0A070","#FF6B9D","#7B68EE","#FFA500","#00CED1","#FFD700","#98FB98","#DDA0DD","#F5DEB3"];
const SIZE_RANGES = {
  Tops:["XXS","XS","S","M","L","XL","XXL","XXXL"],
  Bottoms:["24","25","26","27","28","29","30","31","32","33","34","36","38","40","XS","S","M","L","XL"],
  Dresses:["XXS","XS","S","M","L","XL","XXL"],
  Outerwear:["XXS","XS","S","M","L","XL","XXL","XXXL"],
  Shoes:["35","36","37","38","39","40","41","42","43","44","45"],
  Menswear:["XXS","XS","S","M","L","XL","XXL","XXXL"],
  default:["XXS","XS","S","M","L","XL","XXL"],
};
const NO_SIZE_SUBCATS = new Set(["Belt","Hat / Cap","Bucket Hat","Sunglasses","Scarf","Jewellery","Watch","Hair Accessories","Tote","Backpack","Shoulder Bag","Crossbody","Clutch","Mini Bag","Baguette Bag","90s","Y2K","80s","70s","Retro Sportswear","Band Merch","Other"]);
const GRADES = ["A","AB","B","BC","ABC","C"];
const PLATFORMS = ["Fleek","Instagram (B2C)","Instagram (B2B)","Vinted","Depop","Offline"];
const CURRENCIES = [{ code:"PKR", symbol:"₨" },{ code:"GBP", symbol:"£" },{ code:"USD", symbol:"$" },{ code:"EUR", symbol:"€" }];
const DEFAULT_RATES = { GBP:350, USD:278, EUR:300 };

const BRAND_CATS = {
  encore:{
    "Tops":["Crop Top","Blouse","Tank Top","Knit Top","Tube Top","Corset Top","Other"],
    "Bottoms":["Low-Rise Jeans","Mini Skirt","Micro Skirt","Cargo Pants","Flared Jeans","Bootcut Jeans","Other"],
    "Dresses":["Mini Dress","Slip Dress","Wrap Dress","Baby Doll","Party Dress","Co-ord Set","Other"],
    "Outerwear":["Faux Fur Coat","Denim Jacket","Leather Jacket","Windbreaker","Puffer Vest","Blazer","Other"],
    "Shoes":["Platform Heels","Mules","Chunky Sneakers","Boots","Strappy Sandals","Other"],
    "Accessories":["Belt","Bucket Hat","Sunglasses","Mini Bag","Hair Accessories","Jewellery","Other"],
    "Bags":["Mini Bag","Shoulder Bag","Baguette Bag","Tote","Crossbody","Other"],
  },
};
const GENERIC_CATS = {
  "Tops":["T-Shirt","Shirt","Polo","Sweatshirt","Hoodie","Tank Top","Blouse","Knitwear","Other"],
  "Bottoms":["Jeans","Trousers","Shorts","Skirt","Joggers","Cargo Pants","Chinos","Other"],
  "Dresses":["Mini Dress","Midi Dress","Maxi Dress","Slip Dress","Wrap Dress","Co-ord Set","Other"],
  "Outerwear":["Jacket","Blazer","Coat","Windbreaker","Puffer","Varsity Jacket","Other"],
  "Shoes":["Sneakers","Boots","Loafers","Sandals","Heels","Flats","Other"],
  "Accessories":["Belt","Hat / Cap","Sunglasses","Scarf","Jewellery","Watch","Other"],
  "Bags":["Tote","Backpack","Shoulder Bag","Crossbody","Clutch","Other"],
  "Menswear":["Shirt","T-Shirt","Polo","Trousers","Shorts","Suit Jacket","Blazer","Knitwear","Other"],
  "Vintage":["90s","Y2K","80s","70s","Retro Sportswear","Band Merch","Other"],
  "Other":["Other"],
};

const supplierMemory = {};

function abbr(s,l=2){if(!s)return"";const c=s.replace(/[^a-zA-Z]/g,"");const v=c.replace(/[aeiou]/gi,"");return(v.length>=l?v.slice(0,l):c.slice(0,l)).toUpperCase();}
function buildSku(bn,cat,sub,seq){const b=abbr(bn.replace(/[^a-zA-Z]/g,""),3),c=abbr(cat,2),s=sub&&sub!=="— select —"?abbr(sub,2):"";return s?`${b}-${c}${s}-${String(seq).padStart(3,"0")}`:`${b}-${c}-${String(seq).padStart(3,"0")}`;}
function nextSku(bid,bn,cat,sub,items){const nums=items.filter(i=>i.brand===bid&&i.sku).map(i=>{const m=i.sku.match(/(\d{3})$/);return m?parseInt(m[1]):0;});return buildSku(bn,cat||"",sub||"",(nums.length?Math.max(...nums):0)+1);}
function shuffleSku(bn,cat,sub,items,cur){const used=new Set(items.map(i=>{const m=i.sku?.match(/(\d{3})$/);return m?parseInt(m[1]):null;}).filter(Boolean));const cm=cur?.match(/(\d{3})$/);if(cm)used.add(parseInt(cm[1]));let a=0,n;do{n=Math.floor(Math.random()*899)+100;a++;}while(used.has(n)&&a<200);return buildSku(bn,cat||"",sub||"",n);}

const initBrands=[{id:"encore",name:"Encore",tagline:"Y2K — Womenswear",color:"#C8F135",emoji:"🏷️"},{id:"montvint",name:"MontVint",tagline:"Menswear",color:"#A8D020",emoji:"✨"},{id:"tbd",name:"Coming Soon",tagline:"New brand",color:"#7EB8F0",emoji:"🌿"}];
const initItems=[];

const COLS=[
  {key:"date",    label:"Date",     w:84},
  {key:"name",    label:"Item",     w:160},
  {key:"brand",   label:"Brand",    w:80},
  {key:"category",label:"Category", w:90},
  {key:"subcat",  label:"Subcat",   w:100},
  {key:"qty",     label:"Qty",      w:44},
  {key:"size",    label:"Size",     w:76},
  {key:"grade",   label:"Grade",    w:60},
  {key:"sku",     label:"SKU",      w:88},
  {key:"status",  label:"Status",   w:100},
  {key:"cost",    label:"Cost",     w:80},
  {key:"total",   label:"Total Cost",w:96},
  {key:"price",   label:"Sold",     w:90},
  {key:"notes",   label:"Notes",    w:140},
  {key:"profit",  label:"Profit",   w:90},
  {key:"actions", label:"",         w:72},
];
const TOTAL_W = COLS.reduce((s,c)=>s+c.w,0);
const GRID_COLS = COLS.map(c=>`${c.w}px`).join(" ");

// ── Supabase client ───────────────────────────────────────────────────────────
const sb = createClient(
  'https://fxdkedbaqylijoxgzzhy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGtlZGJhcXlsaWpveGd6emh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTEzNzcsImV4cCI6MjA5NjY2NzM3N30.UnD0tJdicn0ZseU1mpT__aa1kGzwObj4NZAHYchAWR8'
);

const STORE_KEY = 'reloop-data';

async function sbGet() {
  try {
    const { data, error } = await sb.from('kv_store').select('value').eq('key', STORE_KEY).single();
    if (error || !data) return null;
    return JSON.parse(data.value);
  } catch (_) { return null; }
}

async function sbSet(payload) {
  try {
    await sb.from('kv_store').upsert({ key: STORE_KEY, value: JSON.stringify(payload) }, { onConflict: 'key' });
  } catch (_) {}
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function StatusPill({status}){const s=STCOL[status]||{};return <span style={{background:s.bg,color:s.color,fontSize:10,fontFamily:FB,fontWeight:700,padding:"3px 10px",borderRadius:20,letterSpacing:"0.4px",whiteSpace:"nowrap",display:"inline-block",border:`1px solid ${s.color}50`}}>{STLBL[status]}</span>;}
const INP={width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:13,fontFamily:FB,color:T.offWhite,outline:"none",boxSizing:"border-box"};
function Field({label,children}){return <div style={{marginBottom:13}}><label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontFamily:FB}}>{label}</label>{children}</div>;}
function Modal({open,onClose,title,children}){if(!open)return null;return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}><div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:490,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",padding:26}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}><div style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.lime}}>{title}</div><button onClick={onClose} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>{children}</div></div>;}

function IconBtn({title,onClick,danger}){
  const[hov,setHov]=useState(false);
  const col=T.muted,ac=danger?T.rougeText:T.lime;
  return <button onClick={onClick} title={title} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{padding:"5px 7px",border:`1px solid ${hov?(danger?T.rougeText:T.lime):T.border}`,borderRadius:6,background:hov?(danger?T.rougeBg:T.card):"transparent",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s",flexShrink:0}}>
    {danger
      ?<svg width="13" height="14" viewBox="0 0 13 14" fill="none"><rect x="1" y="3" width="11" height="1.1" rx="0.55" fill={hov?ac:col}/><rect x="4.5" y="1" width="4" height="1.1" rx="0.55" fill={hov?ac:col}/><path d="M2.2 4.5 L2.8 12.5 Q2.85 13 3.35 13 H9.65 Q10.15 13 10.2 12.5 L10.8 4.5Z" stroke={hov?ac:col} strokeWidth="1" fill="none" strokeLinejoin="round"/><line x1="5" y1="6" x2="5" y2="11" stroke={hov?ac:col} strokeWidth="1" strokeLinecap="round"/><line x1="6.5" y1="6" x2="6.5" y2="11" stroke={hov?ac:col} strokeWidth="1" strokeLinecap="round"/><line x1="8" y1="6" x2="8" y2="11" stroke={hov?ac:col} strokeWidth="1" strokeLinecap="round"/></svg>
      :<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 1.5 L11.5 3.5 L4.5 10.5 L2 11 L2.5 8.5 Z" stroke={hov?ac:col} strokeWidth="1.1" fill="none" strokeLinejoin="round" strokeLinecap="round"/><line x1="8" y1="3" x2="10" y2="5" stroke={hov?ac:col} strokeWidth="1.1" strokeLinecap="round"/></svg>}
  </button>;
}

function TCell({w,children,left=false}){return <div style={{width:w,minWidth:w,maxWidth:w,display:"flex",alignItems:"center",justifyContent:left?"flex-start":"center",padding:"0 4px",overflow:"hidden"}}>{children}</div>;}

// ── Size Range Picker ─────────────────────────────────────────────────────────
function SizeRangePicker({category,sizeMin,sizeMax,onChange}){
  const sizes=SIZE_RANGES[category]||SIZE_RANGES.default;
  const[mode,setMode]=useState("dropdown");
  const setMin=v=>{const mi=sizes.indexOf(v),mxi=sizes.indexOf(sizeMax);onChange({sizeMin:v,sizeMax:mi>mxi?v:sizeMax});};
  const setMax=v=>{const mxi=sizes.indexOf(v),mi=sizes.indexOf(sizeMin);onChange({sizeMin:mxi<mi?v:sizeMin,sizeMax:v});};
  const minIdx=sizes.indexOf(sizeMin),maxIdx=sizes.indexOf(sizeMax);
  const pills=mode==="dropdown"&&sizeMin&&sizeMax&&minIdx>=0&&maxIdx>=0?sizes.slice(minIdx,maxIdx+1):[];
  return <div style={{display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",gap:6}}>{["dropdown","text"].map(m=><button key={m} type="button" onClick={()=>{setMode(m);onChange({sizeMin:"",sizeMax:""}); }} style={{padding:"3px 12px",borderRadius:20,fontSize:11,fontFamily:FB,cursor:"pointer",border:`1px solid ${mode===m?T.lime:T.border}`,background:mode===m?`${T.lime}22`:"transparent",color:mode===m?T.lime:T.ghost,fontWeight:mode===m?600:400}}>{m==="dropdown"?"Pick from list":"Type manually"}</button>)}</div>
    {mode==="dropdown"
      ?<><div style={{display:"flex",gap:6,alignItems:"center"}}><select style={{...INP,flex:1}} value={sizeMin||""} onChange={e=>setMin(e.target.value)}><option value="">Min</option>{sizes.map(s=><option key={s}>{s}</option>)}</select><span style={{color:T.ghost,fontSize:13,flexShrink:0}}>→</span><select style={{...INP,flex:1}} value={sizeMax||""} onChange={e=>setMax(e.target.value)}><option value="">Max</option>{sizes.map(s=><option key={s}>{s}</option>)}</select></div>{pills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4}}>{pills.map(s=><span key={s} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:`${T.lime}22`,color:T.lime,border:`1px solid ${T.lime}44`,fontWeight:500}}>{s}</span>)}</div>}</>
      :<div style={{display:"flex",gap:6,alignItems:"center"}}><input style={{...INP,flex:1}} type="text" inputMode="numeric" value={sizeMin||""} onChange={e=>onChange({sizeMin:e.target.value,sizeMax})} placeholder="e.g. 28"/><span style={{color:T.ghost,fontSize:13,flexShrink:0}}>→</span><input style={{...INP,flex:1}} type="text" inputMode="numeric" value={sizeMax||""} onChange={e=>onChange({sizeMin,sizeMax:e.target.value})} placeholder="e.g. 34"/></div>}
  </div>;
}

// ── Item Form ─────────────────────────────────────────────────────────────────
function ItemForm({brands,initial,onSave,onClose,defaultBrand,allItems,catTree,onCatTreeChange}){
  const dbid=defaultBrand||brands[0]?.id||"";
  const dbo=brands.find(b=>b.id===dbid);
  const getBCats=id=>catTree[id]||catTree["generic"]||GENERIC_CATS;
  const fCat=Object.keys(getBCats(dbid))[0]||"Tops";
  const[f,setF]=useState(()=>{if(initial)return initial;return{brand:dbid,name:"",productBrand:"",category:fCat,subcategory:"",grade:"",sizeMin:"",sizeMax:"",qty:1,supplierName:"",supplierArea:"",cost:"",price:"",currency:"PKR",status:"available",sku:nextSku(dbid,dbo?.name||"",fCat,"",allItems),notes:"",platforms:[]};});
  const[skuEdited,setSkuEdited]=useState(!!initial?.sku);
  const[addCat,setAddCat]=useState(false);const[newCat,setNewCat]=useState("");
  const[addSub,setAddSub]=useState(false);const[newSub,setNewSub]=useState("");
  const[pbS,setPbS]=useState([]);const[snS,setSnS]=useState([]);const[saS,setSaS]=useState([]);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const cm=getBCats(f.brand);const cl=Object.keys(cm);const sc=cm[f.category]||[];
  const showSize=!NO_SIZE_SUBCATS.has(f.subcategory);
  const tk=catTree[f.brand]?f.brand:"generic";
  const mem=()=>supplierMemory[f.brand]||(supplierMemory[f.brand]={brands:[],suppliers:[],areas:[]});
  const uniq=a=>[...new Set(a)].filter(Boolean);
  const regen=(bid,cat,sub)=>{if(skuEdited)return null;return nextSku(bid,brands.find(b=>b.id===bid)?.name||"",cat,sub,allItems);};
  const setBrand=v=>{const nc=Object.keys(getBCats(v))[0]||"Tops";const s=skuEdited?f.sku:nextSku(v,brands.find(b=>b.id===v)?.name||"",nc,"",allItems);setF(p=>({...p,brand:v,category:nc,subcategory:"",sizeMin:"",sizeMax:"",sku:s}));};
  const setCat=v=>{const s=regen(f.brand,v,"");setF(p=>({...p,category:v,subcategory:"",sizeMin:"",sizeMax:"",...(s?{sku:s}:{})}));};
  const setSubcat=v=>{const s=regen(f.brand,f.category,v);setF(p=>({...p,subcategory:v,sizeMin:NO_SIZE_SUBCATS.has(v)?"":p.sizeMin,sizeMax:NO_SIZE_SUBCATS.has(v)?"":p.sizeMax,...(s?{sku:s}:{})}));};
  const doShuffle=()=>{const bo=brands.find(b=>b.id===f.brand);set("sku",shuffleSku(bo?.name||"",f.category,f.subcategory,allItems,f.sku));setSkuEdited(true);};
  const commitCat=()=>{const v=newCat.trim();if(!v){setAddCat(false);return;}const e=catTree[tk]||{};if(!e[v])onCatTreeChange(tk,{...e,[v]:["Other"]});const s=regen(f.brand,v,"");setF(p=>({...p,category:v,subcategory:"",...(s?{sku:s}:{})}));setNewCat("");setAddCat(false);};
  const commitSub=()=>{const v=newSub.trim();if(!v||!f.category){setAddSub(false);return;}const e=catTree[tk]||{};const c=e[f.category]||[];if(!c.includes(v))onCatTreeChange(tk,{...e,[f.category]:[...c,v]});const s=regen(f.brand,f.category,v);setF(p=>({...p,subcategory:v,...(s?{sku:s}:{})}));setNewSub("");setAddSub(false);};
  const handleSave=()=>{if(!f.name.trim())return;const m=mem();if(f.productBrand)m.brands=uniq([...m.brands,f.productBrand]);if(f.supplierName)m.suppliers=uniq([...m.suppliers,f.supplierName]);if(f.supplierArea)m.areas=uniq([...m.areas,f.supplierArea]);onSave({...f,cost:parseInt(f.cost)||0,price:parseInt(f.price)||0});};
  const ab={padding:"0 10px",height:36,border:`1px solid ${T.lime}`,borderRadius:8,background:"transparent",color:T.lime,cursor:"pointer",fontSize:18,lineHeight:1,fontFamily:FB,flexShrink:0};
  const G2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};
  const Sug=({s,pick,clear})=>s.length===0?null:<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,marginTop:3,overflow:"hidden",boxShadow:"0 6px 20px rgba(0,0,0,0.35)"}}>{s.map(x=><div key={x} onMouseDown={()=>{pick(x);clear();}} style={{padding:"8px 12px",fontSize:12.5,color:T.offWhite,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{x}</div>)}</div>;
  return <div>
    <div style={G2}>
      <Field label="Vertical"><select style={INP} value={f.brand} onChange={e=>setBrand(e.target.value)}>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Item Name"><input style={INP} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Y2K Crop Top"/></Field>
    </div>
    <div style={G2}>
      <Field label="Category">{addCat?<div style={{display:"flex",gap:6}}><input autoFocus style={{...INP,flex:1,borderColor:T.lime}} value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commitCat();if(e.key==="Escape"){setAddCat(false);setNewCat("");}}} placeholder="New category…"/><button onClick={commitCat} style={{...ab,fontSize:13,padding:"0 12px"}}>Add</button><button onClick={()=>{setAddCat(false);setNewCat("");}} style={{...ab,borderColor:T.border,color:T.ghost,fontSize:16}}>×</button></div>:<div style={{display:"flex",gap:6}}><select style={{...INP,flex:1}} value={f.category} onChange={e=>setCat(e.target.value)}>{cl.map(c=><option key={c}>{c}</option>)}</select><button onClick={()=>setAddCat(true)} style={ab}>+</button></div>}</Field>
      <Field label="Subcategory">{addSub?<div style={{display:"flex",gap:6}}><input autoFocus style={{...INP,flex:1,borderColor:T.lime}} value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commitSub();if(e.key==="Escape"){setAddSub(false);setNewSub("");}}} placeholder="New subcategory…"/><button onClick={commitSub} style={{...ab,fontSize:13,padding:"0 12px"}}>Add</button><button onClick={()=>{setAddSub(false);setNewSub("");}} style={{...ab,borderColor:T.border,color:T.ghost,fontSize:16}}>×</button></div>:<div style={{display:"flex",gap:6}}><select style={{...INP,flex:1}} value={f.subcategory} onChange={e=>setSubcat(e.target.value)}><option value="">— select —</option>{sc.map(s=><option key={s}>{s}</option>)}</select><button onClick={()=>setAddSub(true)} style={ab}>+</button></div>}</Field>
    </div>
    <div style={G2}>
      <Field label="Brand (product)"><div style={{position:"relative"}}><input style={INP} value={f.productBrand||""} onChange={e=>{set("productBrand",e.target.value);const m=mem();setPbS(e.target.value?uniq(m.brands).filter(x=>x.toLowerCase().includes(e.target.value.toLowerCase())):[]);}} onBlur={()=>setTimeout(()=>setPbS([]),150)} placeholder="e.g. Levi's, Zara…"/><Sug s={pbS} pick={v=>set("productBrand",v)} clear={()=>setPbS([])}/></div></Field>
      <Field label="Grade"><select style={INP} value={f.grade||""} onChange={e=>set("grade",e.target.value)}><option value="">— select —</option>{GRADES.map(g=><option key={g}>{g}</option>)}</select></Field>
    </div>
    <div style={G2}>
      <Field label="Quantity"><input style={INP} type="number" min="1" value={f.qty||1} onChange={e=>set("qty",Math.max(1,parseInt(e.target.value)||1))}/></Field>
      <Field label="Status"><select style={INP} value={f.status} onChange={e=>set("status",e.target.value)}>{Object.entries(STLBL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
    </div>
    <div style={G2}>
      <Field label="Supplier Name"><div style={{position:"relative"}}><input style={INP} value={f.supplierName||""} onChange={e=>{set("supplierName",e.target.value);const m=mem();setSnS(e.target.value?uniq(m.suppliers).filter(x=>x.toLowerCase().includes(e.target.value.toLowerCase())):[]);}} onBlur={()=>setTimeout(()=>setSnS([]),150)} placeholder="e.g. Zainab Collection"/><Sug s={snS} pick={v=>set("supplierName",v)} clear={()=>setSnS([])}/></div></Field>
      <Field label="Supplier Area"><div style={{position:"relative"}}><input style={INP} value={f.supplierArea||""} onChange={e=>{set("supplierArea",e.target.value);const m=mem();setSaS(e.target.value?uniq(m.areas).filter(x=>x.toLowerCase().includes(e.target.value.toLowerCase())):[]);}} onBlur={()=>setTimeout(()=>setSaS([]),150)} placeholder="e.g. Zainab Market"/><Sug s={saS} pick={v=>set("supplierArea",v)} clear={()=>setSaS([])}/></div></Field>
    </div>
    {showSize&&<Field label="Size range"><SizeRangePicker category={f.category} sizeMin={f.sizeMin} sizeMax={f.sizeMax} onChange={({sizeMin,sizeMax})=>setF(p=>({...p,sizeMin,sizeMax}))}/></Field>}
    <div style={G2}>
      <Field label="Cost Price (₨)"><input style={INP} type="number" value={f.cost} onChange={e=>set("cost",e.target.value)} placeholder="0"/></Field>
      <Field label={<span style={{display:"flex",alignItems:"center",gap:6}}>Sold Price{f.status!=="sold"&&<span style={{fontSize:9,color:T.amberText,background:T.amberBg,padding:"1px 6px",borderRadius:10,fontWeight:600}}>SOLD ONLY</span>}</span>}>
        <div style={{display:"flex",gap:6}}>
          <select style={{...INP,width:76,flexShrink:0,fontWeight:600,color:T.lime}} value={f.currency||"PKR"} onChange={e=>set("currency",e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
          <input style={{...INP,flex:1,opacity:f.status==="sold"?1:0.35,pointerEvents:f.status==="sold"?"auto":"none"}} type="number" value={f.price} onChange={e=>set("price",e.target.value)} placeholder="0" disabled={f.status!=="sold"}/>
        </div>
      </Field>
    </div>
    <div style={G2}>
      <Field label={<span style={{display:"flex",alignItems:"center",gap:6}}>SKU / Tag {!skuEdited&&<span style={{fontSize:9,color:T.lime,fontWeight:600}}>AUTO</span>}</span>}><div style={{display:"flex",gap:6}}><input style={{...INP,flex:1,fontFamily:"monospace"}} value={f.sku} onChange={e=>{set("sku",e.target.value);setSkuEdited(true);}} placeholder="Auto-generated"/><button onClick={doShuffle} style={{height:36,padding:"0 11px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,cursor:"pointer",fontSize:16,color:T.lime,flexShrink:0}}>⇌</button></div></Field>
      <div/>
    </div>
    <Field label="Notes"><textarea style={{...INP,height:72,resize:"vertical",lineHeight:1.5}} value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Source, condition, any extra notes…"/></Field>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
      <button onClick={onClose} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
      <button onClick={handleSave} style={{padding:"8px 20px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Save item</button>
    </div>
  </div>;
}

// ── Brand Form ────────────────────────────────────────────────────────────────
function BrandForm({onSave,onClose}){
  const[name,setName]=useState("");const[tagline,setTag]=useState("");const[emoji,setEmoji]=useState("");const[color,setColor]=useState(PALETTE[0]);
  return <div><Field label="Brand name"><input style={INP} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Velour Vintage"/></Field><Field label="Tagline"><input style={INP} value={tagline} onChange={e=>setTag(e.target.value)} placeholder="e.g. Curated Y2K pieces"/></Field><Field label="Brand colour"><div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>{PALETTE.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",outline:color===c?`3px solid ${T.white}`:"3px solid transparent",outlineOffset:2}}/>)}</div></Field><Field label="Emoji icon"><input style={{...INP,width:72}} value={emoji} onChange={e=>setEmoji(e.target.value)} placeholder="👗" maxLength={4}/></Field><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}><button onClick={onClose} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button><button onClick={()=>{if(!name.trim())return;onSave({id:name.toLowerCase().replace(/\s+/g,"-")+"-"+Date.now(),name,tagline,color,emoji:emoji||"🏷️"});}} style={{padding:"8px 20px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Add brand</button></div></div>;
}

// ── Categories Page ───────────────────────────────────────────────────────────
function CategoriesPage({catTree,setCatTree,brands}){
  const[selBrand,setSelBrand]=useState("encore");const[selCat,setSelCat]=useState(null);const[nCat,setNCat]=useState("");const[nSub,setNSub]=useState("");const[eCat,setECat]=useState(null);const[eCatV,setECatV]=useState("");const[eSub,setESub]=useState(null);const[eSubV,setESubV]=useState("");
  const tk=catTree[selBrand]?selBrand:"generic";const cm=catTree[tk]||{};const cats=Object.keys(cm);const subs=selCat?(cm[selCat]||[]):[];
  const upd=(k,m)=>setCatTree(p=>({...p,[k]:m}));
  const addCat=()=>{const v=nCat.trim();if(!v||cm[v])return;upd(tk,{...cm,[v]:["Other"]});setSelCat(v);setNCat("");};
  const delCat=c=>{const n={...cm};delete n[c];upd(tk,n);if(selCat===c)setSelCat(Object.keys(n)[0]||null);};
  const renCat=old=>{const v=eCatV.trim();if(!v||(v!==old&&cm[v])){setECat(null);return;}if(v===old){setECat(null);return;}const n={};for(const[k,s]of Object.entries(cm))n[k===old?v:k]=s;upd(tk,n);if(selCat===old)setSelCat(v);setECat(null);};
  const addSub=()=>{if(!selCat)return;const v=nSub.trim();if(!v||subs.includes(v))return;upd(tk,{...cm,[selCat]:[...subs,v]});setNSub("");};
  const delSub=i=>upd(tk,{...cm,[selCat]:subs.filter((_,x)=>x!==i)});
  const renSub=i=>{const v=eSubV.trim();if(!v){setESub(null);return;}const n=[...subs];n[i]=v;upd(tk,{...cm,[selCat]:n});setESub(null);};
  const tabs=[{id:"encore",label:brands.find(b=>b.id==="encore")?.name||"Encore"},{id:"generic",label:"Default"},...brands.filter(b=>!["encore","tbd"].includes(b.id)&&catTree[b.id]).map(b=>({id:b.id,label:b.name}))];
  const I2={flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:13,fontFamily:FB,color:T.offWhite,outline:"none"};
  const AB={padding:"8px 14px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB};
  const II={background:"transparent",border:"none",outline:"none",fontSize:13,color:T.offWhite,fontFamily:FB,flex:1,minWidth:0};
  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}><div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px"}}><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite}}>Category Tree</div></div><div style={{flex:1,overflowY:"auto",background:"#FFF",padding:20}}><div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{tabs.map(t=>{const a=selBrand===t.id||(!catTree[selBrand]&&t.id==="generic");return <button key={t.id} onClick={()=>{setSelBrand(t.id);setSelCat(null);}} style={{padding:"6px 16px",borderRadius:20,fontSize:12.5,border:`1px solid ${a?T.lime:T.border}`,background:a?T.lime:"transparent",color:a?T.ink:T.muted,cursor:"pointer",fontFamily:FB,fontWeight:a?700:400}}>{t.label}</button>;})}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr",gap:0}}><div style={{paddingRight:20}}><div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1px",color:T.ghost,marginBottom:10,fontWeight:600}}>Categories</div><div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:12}}>{cats.length===0&&<div style={{padding:"16px 12px",fontSize:12,color:T.ghost,textAlign:"center"}}>No categories yet</div>}{cats.map(c=><div key={c} onClick={()=>setSelCat(c)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:selCat===c?T.card:"transparent",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}>{eCat===c?<><input autoFocus value={eCatV} onChange={e=>setECatV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renCat(c);if(e.key==="Escape")setECat(null);}} onBlur={()=>renCat(c)} onClick={e=>e.stopPropagation()} style={II}/><span style={{fontSize:11,color:T.lime,cursor:"pointer"}} onClick={e=>{e.stopPropagation();renCat(c);}}>✓</span></>:<><span style={{fontSize:13,color:selCat===c?T.offWhite:T.muted,fontWeight:selCat===c?500:400,flex:1}}>{c}</span><span style={{fontSize:10,color:T.ghost,background:T.bg,padding:"1px 6px",borderRadius:20}}>{(cm[c]||[]).length}</span><button onClick={e=>{e.stopPropagation();setECat(c);setECatV(c);}} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:12,padding:"0 2px",opacity:0.6}}>✎</button><button onClick={e=>{e.stopPropagation();delCat(c);}} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,padding:"0 2px"}}>✕</button></>}</div>)}</div><div style={{display:"flex",gap:8}}><input value={nCat} onChange={e=>setNCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()} placeholder="New category…" style={I2}/><button onClick={addCat} style={AB}>Add</button></div></div><div style={{background:T.border,alignSelf:"stretch",minHeight:400}}/><div style={{paddingLeft:20}}><div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1px",color:T.ghost,marginBottom:10,fontWeight:600}}>{selCat?`Subcategories — ${selCat}`:"Subcategories"}</div>{!selCat?<div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:13,color:T.ghost}}>← Select a category</div></div>:<><div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:12}}>{subs.length===0&&<div style={{padding:"16px 12px",fontSize:12,color:T.ghost}}>No subcategories yet</div>}{subs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>{eSub?.cat===selCat&&eSub?.idx===i?<><input autoFocus value={eSubV} onChange={e=>setESubV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renSub(i);if(e.key==="Escape")setESub(null);}} onBlur={()=>renSub(i)} style={II}/><span style={{fontSize:11,color:T.lime,cursor:"pointer"}} onClick={()=>renSub(i)}>✓</span></>:<><span style={{fontSize:13,color:T.muted,flex:1}}>{s}</span>{NO_SIZE_SUBCATS.has(s)&&<span style={{fontSize:9.5,color:T.amberText,background:T.amberBg,padding:"1px 7px",borderRadius:10,fontWeight:600}}>No size</span>}<span style={{fontSize:10,color:T.ghost,background:T.bg,padding:"1px 6px",borderRadius:20}}>{i+1}</span><button onClick={()=>{setESub({cat:selCat,idx:i});setESubV(s);}} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:12,padding:"0 2px",opacity:0.6}}>✎</button><button onClick={()=>delSub(i)} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,padding:"0 2px"}}>✕</button></>}</div>)}</div><div style={{display:"flex",gap:8}}><input value={nSub} onChange={e=>setNSub(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSub()} placeholder="New subcategory…" style={I2}/><button onClick={addSub} style={AB}>Add</button></div></>}</div></div></div></div>;
}

// ── Jobs Page ─────────────────────────────────────────────────────────────────
function FixesPage({fixes,setFixes,items,brands}){
  const[view,setView]=useState("log");const[formOpen,setFormOpen]=useState(false);const[retId,setRetId]=useState(null);const[retData,setRetData]=useState({returnedDate:"",rating:0,notes:""});const[nfid,setNfid]=useState(1);
  const bf={brand:"",type:"Mending",date:"",pieces:1,tailor:"",notes:""};const[form,setForm]=useState(bf);const sf=(k,v)=>setForm(p=>({...p,[k]:v}));
  const gb=id=>brands.find(b=>b.id===id);const af=fixes.filter(f=>!f.returned);const cf=fixes.filter(f=>f.returned);
  const sc=t=>t==="Mending"?"#7EB8F0":t==="Washing"?"#7ECB7E":t==="Dyeing"?"#C070F0":t==="Tailoring"?"#F0C060":t==="Dry Clean"?"#70F0D0":"#9B8FBB";
  const sub=()=>{if(!form.type||!form.date)return;setFixes(p=>[...p,{id:nfid,...form,pieces:parseInt(form.pieces)||1,returned:false,returnedDate:null,rating:null,returnNotes:""}]);setNfid(n=>n+1);setForm(bf);setFormOpen(false);};
  const subRet=()=>{if(!retData.returnedDate||!retData.rating)return;setFixes(p=>p.map(f=>f.id===retId?{...f,returned:true,...retData}:f));setRetId(null);};
  const I3={width:"100%",padding:"8px 11px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:13,fontFamily:FB,color:T.offWhite,outline:"none",boxSizing:"border-box"};
  const FR=({label,children})=><div style={{marginBottom:12}}><label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.9px"}}>{label}</label>{children}</div>;
  const Stars=({value,onChange})=><div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(s=><span key={s} onClick={()=>onChange(s)} style={{fontSize:22,cursor:"pointer",color:s<=value?T.lime:T.ghost}}>★</span>)}</div>;
  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}><div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>Jobs</div><div style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>{[{k:"log",l:"Active"},{k:"history",l:"History"}].map((t,i)=><button key={t.k} onClick={()=>setView(t.k)} style={{padding:"6px 14px",background:view===t.k?T.lime:"transparent",border:"none",borderLeft:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",fontSize:12.5,color:view===t.k?T.ink:T.muted,fontFamily:FB,fontWeight:view===t.k?700:400}}>{t.l} ({t.k==="log"?af.length:cf.length})</button>)}</div><button onClick={()=>setFormOpen(true)} style={{padding:"7px 18px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Log jobs</button></div><div style={{flex:1,overflowY:"auto",background:"#FFF",padding:"18px 20px"}}>{view==="log"&&(af.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36}}>🧵</div><div style={{fontSize:18,fontWeight:600,color:T.ghost}}>No active jobs</div></div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>{af.map(fx=><div key={fx.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",display:"grid",gridTemplateColumns:"100px 1fr 100px 80px 80px 120px 80px",gap:12,alignItems:"center"}}><div style={{fontSize:12,color:T.muted}}>{fx.date}</div><div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{fx.notes||"—"}</div><span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:`${sc(fx.type)}22`,color:sc(fx.type),border:`1px solid ${sc(fx.type)}44`}}>{fx.type}</span><div style={{fontSize:13,color:T.offWhite}}>{fx.pieces}</div><div style={{fontSize:11,fontWeight:600,color:gb(fx.brand)?.color||T.muted}}>{gb(fx.brand)?.name||"—"}</div><div style={{fontSize:12,color:T.muted}}>{fx.tailor||"—"}</div><button onClick={()=>{setRetId(fx.id);setRetData({returnedDate:new Date().toISOString().slice(0,10),rating:0,notes:""}); }} style={{padding:"5px 10px",border:`1px solid ${T.lime}`,borderRadius:7,background:"transparent",color:T.lime,cursor:"pointer",fontSize:12,fontFamily:FB}}>Mark returned</button></div>)}</div>)}{view==="history"&&(cf.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36}}>📋</div><div style={{fontSize:18,fontWeight:600,color:T.ghost,marginTop:12}}>No completed fixes yet</div></div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>{cf.map(fx=><div key={fx.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px"}}><div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{fx.notes||"—"}</div><div style={{fontSize:11,color:T.ghost,marginTop:4}}>{fx.date} → {fx.returnedDate} · {fx.pieces} pcs</div></div>)}</div>)}</div>
  {formOpen&&<div onClick={()=>setFormOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}><div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:460,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",padding:26}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.lime}}>Log jobs</div><button onClick={()=>setFormOpen(false)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FR label="Fix type"><select style={I3} value={form.type} onChange={e=>sf("type",e.target.value)}>{["Mending","Washing","Dyeing","Tailoring","Dry Clean","Other"].map(t=><option key={t}>{t}</option>)}</select></FR><FR label="Vertical"><select style={I3} value={form.brand} onChange={e=>sf("brand",e.target.value)}><option value="">— select —</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></FR></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FR label="Date sent"><input style={I3} type="date" value={form.date} onChange={e=>sf("date",e.target.value)}/></FR><FR label="No. of pieces"><input style={I3} type="number" min="1" value={form.pieces} onChange={e=>sf("pieces",e.target.value)}/></FR></div><FR label="Tailor / Vendor"><input style={I3} value={form.tailor} onChange={e=>sf("tailor",e.target.value)} placeholder="e.g. Rehman Tailor"/></FR><FR label="Notes"><input style={I3} value={form.notes} onChange={e=>sf("notes",e.target.value)} placeholder="e.g. 3 jeans for hem alteration"/></FR><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}><button onClick={()=>setFormOpen(false)} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button><button onClick={sub} style={{padding:"8px 20px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Save entry</button></div></div></div>}
  {retId!==null&&<div onClick={()=>setRetId(null)} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}><div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:420,maxWidth:"96vw",padding:26}}><div style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.lime,marginBottom:20}}>Mark as returned</div><FR label="Date returned"><input style={I3} type="date" value={retData.returnedDate} onChange={e=>setRetData(p=>({...p,returnedDate:e.target.value}))}/></FR><FR label="Rating"><Stars value={retData.rating} onChange={v=>setRetData(p=>({...p,rating:v}))}/></FR><FR label="Notes"><input style={I3} value={retData.notes} onChange={e=>setRetData(p=>({...p,notes:e.target.value}))} placeholder="Quality observations…"/></FR><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}><button onClick={()=>setRetId(null)} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button><button onClick={subRet} style={{padding:"8px 20px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Confirm return</button></div></div></div>}
  </div>;
}

// ── Bundles Page ─────────────────────────────────────────────────────────────
const BUNDLE_PLATFORMS = ["Fleek","Instagram (B2C)","Instagram (B2B)","Vinted","Depop","Offline"];
const BUNDLE_STATUSES = ["Draft","Active","Sold","Archived"];
const BUNDLE_STATUS_COL = {
  Draft:   { bg:"#1A2040", color:"#7EB8F0" },
  Active:  { bg:"#1A2E1A", color:"#7ECB7E" },
  Sold:    { bg:"#2E1010", color:"#F07070" },
  Archived:{ bg:"#1E1530", color:"#6B5F8B" },
};

function genBundleCode(existing) {
  const nums = existing.map(b => { const m = b.code?.match(/BDL-(\d+)/); return m ? parseInt(m[1]) : 0; });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `BDL-${String(next).padStart(4,"0")}`;
}

function BundlesPage({ items, bundles, setBundles, brands }) {
  const [view, setView]     = useState("list");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("all");
  const [filterStat, setFilterStat] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");

  const blankForm = { name:"", brand:"", platform:"Fleek", skus:[], notes:"", status:"Draft", price:"", currency:"PKR" };
  const [form, setForm] = useState(blankForm);
  const sf = (k,v) => setForm(p=>({...p,[k]:v}));

  const setBrandFilter = v => { sf("brand", v); sf("skus", []); };
  const brandItems = form.brand ? (items||[]).filter(i=>i.brand===form.brand) : (items||[]);
  const getBrand = id => (brands||[]).find(b=>b.id===id);
  const addSku = item => {
    if (!form.skus.find(s=>s.sku===item.sku))
      sf("skus", [...form.skus, { sku:item.sku, name:item.name, id:item.id, qty:1 }]);
  };
  const removeSku = sku => sf("skus", form.skus.filter(s=>s.sku!==sku));
  const updateQty = (sku,qty) => sf("skus", form.skus.map(s=>s.sku===sku?{...s,qty:Math.max(1,parseInt(qty)||1)}:s));

  const saveBundle = () => {
    if (!form.name.trim() || form.skus.length===0) return;
    const code = selected ? bundles.find(b=>b.id===selected)?.code : genBundleCode(bundles);
    const now = new Date().toLocaleDateString("en-GB");
    if (selected) {
      setBundles(p=>p.map(b=>b.id===selected?{...b,...form,code,updatedAt:now}:b));
    } else {
      setBundles(p=>[...p,{id:Date.now(),...form,code,createdAt:now,updatedAt:now}]);
    }
    setForm(blankForm); setSelected(null); setView("list");
  };

  const deleteBundle = id => { setBundles(p=>p.filter(b=>b.id!==id)); if(selected===id){setSelected(null);setView("list");} };
  const openEdit = b => { setForm({name:b.name,brand:b.brand||"",platform:b.platform,skus:b.skus,notes:b.notes,status:b.status,price:b.price||"",currency:b.currency||"PKR"}); setSelected(b.id); setView("create"); };

  const filtered = (bundles||[]).filter(b=>{
    const sq=search.toLowerCase();
    const ms=!sq||b.name.toLowerCase().includes(sq)||b.code.toLowerCase().includes(sq)||b.skus.some(s=>s.sku.toLowerCase().includes(sq));
    const mp=filterPlat==="all"||b.platform===filterPlat;
    const mst=filterStat==="all"||b.status===filterStat;
    const mb=filterBrand==="all"||b.brand===filterBrand;
    return ms&&mp&&mst&&mb;
  });

  const detailBundle = view==="detail" ? bundles.find(b=>b.id===selected) : null;
  const SYMS = { PKR:"₨", GBP:"£", USD:"$", EUR:"€" };
  const gb = id => brands.find(b=>b.id===id);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>
          {view==="create"?(selected?"Edit Bundle":"New Bundle"):view==="detail"&&detailBundle?detailBundle.code:"Bundles"}
        </div>
        {view==="list"&&<>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:T.ghost,pointerEvents:"none"}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search bundles…" style={{padding:"7px 12px 7px 28px",border:`1px solid ${T.border}`,borderRadius:9,background:T.card,fontSize:12.5,fontFamily:FB,color:T.offWhite,width:180,outline:"none"}}/>
          </div>
          <button onClick={()=>{setForm(blankForm);setSelected(null);setView("create");}} style={{padding:"7px 18px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ New bundle</button>
        </>}
        {(view==="create"||view==="detail")&&<button onClick={()=>{setView("list");setSelected(null);setForm(blankForm);}} style={{padding:"7px 16px",border:`1px solid ${T.border}`,borderRadius:9,background:"transparent",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:FB}}>← Back</button>}
      </div>

      {view==="list"&&(
        <div style={{flex:1,overflowY:"auto",background:"#FFF",padding:"18px 20px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
            {[
              {label:"Total bundles",val:bundles.length},
              {label:"Active",val:bundles.filter(b=>b.status==="Active").length},
              {label:"Sold",val:bundles.filter(b=>b.status==="Sold").length},
              {label:"SKUs in bundles",val:[...new Set(bundles.flatMap(b=>b.skus.map(s=>s.sku)))].length},
            ].map(s=><div key={s.label} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9.5,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>{s.label}</div>
              <div style={{fontSize:24,fontWeight:700,color:T.lime}}>{s.val}</div>
            </div>)}
          </div>

          <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <select value={filterBrand} onChange={e=>setFilterBrand(e.target.value)} style={{padding:"5px 10px",borderRadius:20,fontSize:12,border:`1px solid ${T.border}`,background:T.card,color:T.muted,fontFamily:FB,cursor:"pointer",outline:"none"}}>
              <option value="all">All verticals</option>
              {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={filterPlat} onChange={e=>setFilterPlat(e.target.value)} style={{padding:"5px 10px",borderRadius:20,fontSize:12,border:`1px solid ${T.border}`,background:T.card,color:T.muted,fontFamily:FB,cursor:"pointer",outline:"none"}}>
              <option value="all">All platforms</option>
              {BUNDLE_PLATFORMS.map(p=><option key={p}>{p}</option>)}
            </select>
            <select value={filterStat} onChange={e=>setFilterStat(e.target.value)} style={{padding:"5px 10px",borderRadius:20,fontSize:12,border:`1px solid ${T.border}`,background:T.card,color:T.muted,fontFamily:FB,cursor:"pointer",outline:"none"}}>
              <option value="all">All statuses</option>
              {BUNDLE_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <div style={{height:16,width:1,background:T.border,margin:"0 4px"}}/>
            <span style={{fontSize:11.5,color:T.ghost}}>{filtered.length} bundle{filtered.length!==1?"s":""}</span>
          </div>

          {bundles.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>📦</div>
              <div style={{fontSize:20,fontWeight:700,color:T.ghost,marginBottom:6}}>No bundles yet</div>
              <div style={{fontSize:13,color:T.ghost,marginBottom:20}}>Create your first bundle by grouping inventory items for a platform listing</div>
              <button onClick={()=>{setForm(blankForm);setSelected(null);setView("create");}} style={{padding:"9px 22px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Create first bundle</button>
            </div>
          ):(
            <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflowX:"auto"}}>
              <div style={{minWidth:780}}>
                <div style={{display:"grid",gridTemplateColumns:"110px 1fr 90px 90px 70px 90px 90px 70px",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.card,borderRadius:"12px 12px 0 0"}}>
                  {["Bundle Code","Name","Vertical","Platform","Items","Price","Status",""].map((h,i)=>(
                    <div key={i} style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600,textAlign:i>=4?"center":"left"}}>{h}</div>
                  ))}
                </div>
                {filtered.map((b,idx)=>{
                  const sc=BUNDLE_STATUS_COL[b.status]||{};
                  const sym=SYMS[b.currency||"PKR"]||"₨";
                  const bBrand=getBrand(b.brand);
                  return(
                    <div key={b.id} onClick={()=>{setSelected(b.id);setView("detail");}}
                      style={{display:"grid",gridTemplateColumns:"110px 1fr 90px 90px 70px 90px 90px 70px",padding:"12px 16px",borderBottom:idx===filtered.length-1?"none":`1px solid ${T.border}`,cursor:"pointer",transition:"background 0.12s",alignItems:"center"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.card}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:T.lime,letterSpacing:"0.5px"}}>{b.code}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{b.name}</div>
                        <div style={{fontSize:11,color:T.ghost,marginTop:2}}>{b.skus.map(s=>s.sku).join(" · ")}</div>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,color:bBrand?.color||T.ghost}}>{bBrand?.name||"—"}</div>
                      <div style={{fontSize:12,color:T.muted}}>{b.platform}</div>
                      <div style={{textAlign:"center"}}><span style={{fontSize:12,fontWeight:600,color:T.cobaltText,background:T.cobaltBg,padding:"2px 8px",borderRadius:20}}>{b.skus.length}</span></div>
                      <div style={{textAlign:"center",fontSize:13,fontWeight:700,color:b.price?T.lime:T.ghost}}>{b.price?`${sym}${parseInt(b.price).toLocaleString()}`:"—"}</div>
                      <div style={{textAlign:"center"}}><span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.color}44`}}>{b.status}</span></div>
                      <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                        <IconBtn title="Edit" onClick={e=>{e.stopPropagation();openEdit(b);}}/>
                        <IconBtn title="Delete" danger onClick={e=>{e.stopPropagation();deleteBundle(b.id);}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view==="create"&&(
        <div style={{flex:1,overflowY:"auto",background:"#FFF",padding:"20px 24px"}}>
          <div style={{maxWidth:620}}>
            {selected&&<div style={{background:T.card,border:`1px solid ${T.lime}30`,borderRadius:10,padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:T.lime}}>{bundles.find(b=>b.id===selected)?.code}</span>
              <span style={{fontSize:11,color:T.ghost}}>Editing existing bundle</span>
            </div>}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Field label="Bundle name"><input style={INP} value={form.name} onChange={e=>sf("name",e.target.value)} placeholder="e.g. Encore Summer Drop #1"/></Field>
              <Field label="Platform"><select style={INP} value={form.platform} onChange={e=>sf("platform",e.target.value)}>{BUNDLE_PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></Field>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Field label="Status"><select style={INP} value={form.status} onChange={e=>sf("status",e.target.value)}>{BUNDLE_STATUSES.map(s=><option key={s}>{s}</option>)}</select></Field>
              <Field label="Bundle listing price">
                <div style={{display:"flex",gap:6}}>
                  <select style={{...INP,width:76,flexShrink:0,fontWeight:600,color:T.lime}} value={form.currency||"PKR"} onChange={e=>sf("currency",e.target.value)}>{["PKR","GBP","USD","EUR"].map(c=><option key={c}>{c}</option>)}</select>
                  <input style={{...INP,flex:1}} type="number" value={form.price} onChange={e=>sf("price",e.target.value)} placeholder="0"/>
                </div>
              </Field>
            </div>

            <Field label="Select Vertical">
              <select style={INP} value={form.brand} onChange={e=>setBrandFilter(e.target.value)}>
                <option value="">— All verticals —</option>
                {brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>

            <Field label={`Pick items from inventory${form.brand?" ("+getBrand(form.brand)?.name+")":""}`}>
              <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",maxHeight:240,overflowY:"auto"}}>
                {brandItems.length===0?(
                  <div style={{padding:"20px",textAlign:"center",fontSize:12,color:T.ghost}}>No items found{form.brand?" in this vertical":""}</div>
                ):(
                  brandItems.map(item=>{
                    const already = !!form.skus.find(s=>s.sku===item.sku);
                    const bBrand = getBrand(item.brand);
                    return(
                      <div key={item.id}
                        onClick={()=>!already&&addSku(item)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${T.border}`,cursor:already?"default":"pointer",background:already?`${T.lime}10`:"transparent",transition:"background 0.1s"}}
                        onMouseEnter={e=>{if(!already)e.currentTarget.style.background=T.surface;}}
                        onMouseLeave={e=>{if(!already)e.currentTarget.style.background="transparent";}}>
                        <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:already?T.lime:T.ghost,background:already?`${T.lime}18`:T.card,padding:"2px 7px",borderRadius:5,flexShrink:0}}>{item.sku}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:500,color:already?T.lime:T.offWhite,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                          <div style={{fontSize:10,color:T.ghost,marginTop:1}}>{bBrand?.name} · {item.category}{item.subcategory?` · ${item.subcategory}`:""}</div>
                        </div>
                        <StatusPill status={item.status}/>
                        {already
                          ?<span style={{fontSize:10,color:T.lime,fontWeight:700,flexShrink:0}}>✓ Added</span>
                          :<span style={{fontSize:18,color:T.lime,flexShrink:0,opacity:0.6}}>+</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </Field>

            {form.skus.length>0&&(
              <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:14}}>
                <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>Bundle items</span>
                  <span style={{color:T.lime,background:`${T.lime}18`,padding:"2px 8px",borderRadius:20,fontWeight:700}}>{form.skus.length} SKU{form.skus.length!==1?"s":""}</span>
                </div>
                {form.skus.map(s=>{
                  const inv=items.find(i=>i.sku===s.sku);
                  return(
                    <div key={s.sku} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontFamily:"monospace",fontSize:11,color:T.lime,background:`${T.lime}18`,padding:"2px 7px",borderRadius:5,flexShrink:0}}>{s.sku}</span>
                      <span style={{fontSize:13,color:T.offWhite,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</span>
                      {inv&&<span style={{fontSize:11,color:T.ghost,flexShrink:0}}>{inv.category}</span>}
                      <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                        <label style={{fontSize:10,color:T.ghost}}>Qty</label>
                        <input type="number" min="1" value={s.qty} onChange={e=>updateQty(s.sku,e.target.value)}
                          style={{width:46,padding:"4px 7px",border:`1px solid ${T.border}`,borderRadius:6,background:T.surface,color:T.offWhite,fontSize:12,fontFamily:FB,outline:"none",textAlign:"center"}}/>
                      </div>
                      <button onClick={()=>removeSku(s.sku)} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:16,padding:"0 2px",lineHeight:1}}>×</button>
                    </div>
                  );
                })}
              </div>
            )}

            <Field label="Notes / description">
              <textarea style={{...INP,height:72,resize:"vertical",lineHeight:1.5}} value={form.notes} onChange={e=>sf("notes",e.target.value)} placeholder="Bundle description, listing notes, special instructions…"/>
            </Field>

            <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
              <button onClick={()=>{setView("list");setSelected(null);setForm(blankForm);}} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
              <button onClick={saveBundle} disabled={!form.name.trim()||form.skus.length===0}
                style={{padding:"8px 22px",border:"none",borderRadius:8,background:(!form.name.trim()||form.skus.length===0)?T.border:T.lime,color:(!form.name.trim()||form.skus.length===0)?T.ghost:T.ink,cursor:(!form.name.trim()||form.skus.length===0)?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>
                {selected?"Update bundle":"Create bundle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view==="detail"&&detailBundle&&(()=>{
        const b=detailBundle;
        const sc=BUNDLE_STATUS_COL[b.status]||{};
        const sym=SYMS[b.currency||"PKR"]||"₨";
        const bBrand=getBrand(b.brand);
        return(
          <div style={{flex:1,overflowY:"auto",background:"#FFF",padding:"20px 24px"}}>
            <div style={{maxWidth:600}}>
              <div style={{background:T.card,borderRadius:14,border:`1px solid ${T.border}`,padding:"20px 22px",marginBottom:18}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:T.lime,letterSpacing:"0.8px",marginBottom:6}}>{b.code}</div>
                    <div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,marginBottom:8}}>{b.name}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.color}44`}}>{b.status}</span>
                      {bBrand&&<span style={{fontSize:12,fontWeight:600,color:bBrand.color}}>{bBrand.name}</span>}
                      <span style={{fontSize:12,color:T.muted}}>{b.platform}</span>
                      <span style={{fontSize:11,color:T.ghost}}>Created {b.createdAt}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {b.price&&<div style={{fontSize:22,fontWeight:700,color:T.lime}}>{sym}{parseInt(b.price).toLocaleString()}</div>}
                    <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-end"}}>
                      <IconBtn title="Edit" onClick={()=>openEdit(b)}/>
                      <IconBtn title="Delete" danger onClick={()=>deleteBundle(b.id)}/>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:18}}>
                <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600}}>Items in bundle</span>
                  <span style={{fontSize:11,color:T.cobaltText,background:T.cobaltBg,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{b.skus.length} SKU{b.skus.length!==1?"s":""}</span>
                </div>
                {b.skus.map(s=>{
                  const inv=items.find(i=>i.sku===s.sku);
                  return(
                    <div key={s.sku} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:T.lime,background:`${T.lime}18`,padding:"3px 9px",borderRadius:6,flexShrink:0}}>{s.sku}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{s.name}</div>
                        {inv&&<div style={{fontSize:11,color:T.ghost,marginTop:2}}>{inv.category}{inv.subcategory?` · ${inv.subcategory}`:""}{inv.sizeMin?` · ${inv.sizeMin}${inv.sizeMax&&inv.sizeMax!==inv.sizeMin?`–${inv.sizeMax}`:""}`:""}</div>}
                      </div>
                      <div style={{flexShrink:0,textAlign:"center"}}>
                        <div style={{fontSize:10,color:T.ghost,marginBottom:2}}>Qty</div>
                        <div style={{fontSize:14,fontWeight:700,color:T.offWhite}}>{s.qty}</div>
                      </div>
                      {inv&&<div style={{flexShrink:0}}><StatusPill status={inv.status}/></div>}
                    </div>
                  );
                })}
              </div>

              {b.notes&&<div style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"14px 16px",marginBottom:18}}>
                <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600,marginBottom:8}}>Notes</div>
                <div style={{fontSize:13,color:T.muted,lineHeight:1.6}}>{b.notes}</div>
              </div>}

              <div style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"14px 16px"}}>
                <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600,marginBottom:10}}>Update status</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {BUNDLE_STATUSES.map(st=>{
                    const ssc=BUNDLE_STATUS_COL[st]||{};
                    const active=b.status===st;
                    return <button key={st} onClick={()=>setBundles(p=>p.map(x=>x.id===b.id?{...x,status:st}:x))}
                      style={{padding:"6px 16px",borderRadius:20,fontSize:12.5,cursor:"pointer",fontFamily:FB,border:`1px solid ${active?ssc.color:T.border}`,background:active?`${ssc.color}22`:"transparent",color:active?ssc.color:T.muted,fontWeight:active?700:400}}>{st}</button>;
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Conversion Page ───────────────────────────────────────────────────────────
function ConversionPage({rates,setRates}){
  const[saved,setSaved]=useState(false);
  const[local,setLocal]=useState({...rates});
  const pairs=[{from:"GBP",symbol:"£",label:"British Pound"},{from:"USD",symbol:"$",label:"US Dollar"},{from:"EUR",symbol:"€",label:"Euro"}];
  const save=()=>{setRates(local);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}><div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>Currency Conversion</div>{saved&&<span style={{fontSize:12,color:T.lime}}>✓ Rates saved</span>}<button onClick={save} style={{padding:"7px 18px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Save rates</button></div><div style={{flex:1,overflowY:"auto",background:"#FFF",padding:"28px 24px"}}><div style={{maxWidth:500}}><p style={{fontSize:13,color:T.ghost,marginBottom:24,lineHeight:1.6}}>Set the exchange rates used to automatically convert sold prices to PKR. Applied whenever an item is sold in a foreign currency.</p>{pairs.map(({from,symbol,label})=><div key={from} style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"18px 20px",marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div style={{fontSize:15,fontWeight:700,color:T.offWhite}}>{symbol} {from} <span style={{fontSize:11,color:T.ghost,fontWeight:400}}>— {label}</span></div><div style={{fontSize:11,color:T.ghost}}>→ PKR</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,borderRadius:8,padding:"8px 12px",border:`1px solid ${T.border}`,flex:1}}><span style={{fontSize:16,fontWeight:700,color:T.lime}}>{symbol}1</span><span style={{fontSize:18,color:T.ghost}}>=</span><span style={{fontSize:13,color:T.ghost}}>₨</span><input type="number" min="1" value={local[from]||""} onChange={e=>setLocal(p=>({...p,[from]:e.target.value}))} placeholder="e.g. 350" style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:18,fontWeight:700,color:T.offWhite,fontFamily:FB,width:80}}/></div></div>{local[from]>0&&<div style={{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}}>{[1,10,50,100].map(a=><div key={a} style={{background:T.surface,borderRadius:8,padding:"6px 12px",fontSize:11,color:T.muted}}>{symbol}{a} = <span style={{color:T.lime,fontWeight:600}}>₨{(a*parseFloat(local[from])).toLocaleString()}</span></div>)}</div>}</div>)}<div style={{background:`${T.lime}10`,border:`1px solid ${T.lime}30`,borderRadius:10,padding:"14px 16px",marginTop:8}}><div style={{fontSize:11,color:T.lime,fontWeight:600,marginBottom:6}}>💡 How it works</div><div style={{fontSize:12,color:T.ghost,lineHeight:1.7}}>When you enter a sold price in GBP, USD, or EUR, Reloop auto-converts to PKR using your saved rate for profit calculations.</div></div></div></div></div>;
}

function EditableTagline({value,bold,italic,color,onChange}){
  const[e,setE]=useState(false);
  const[v,setV]=useState(value);
  const[b,setB]=useState(!!bold);
  const[it,setIt]=useState(italic!==false?true:false);
  const[col,setCol]=useState(color||T.white);
  const fw=b?"700":"400";const fs=it?"italic":"normal";
  const tc=color||T.white;
  const commit=()=>{if(v.trim())onChange(v.trim(),b,it,col);setE(false);};
  const openEdit=()=>{setV(value);setB(!!bold);setIt(italic!==false);setCol(color||T.white);setE(true);};
  const TPAL=["#FFFFFF","#F0EBF8","#C8F135","#7EB8F0","#7ECB7E","#F0C060","#F07070","#C070F0","#70F0D0","#FF6B9D","#FFA500","#FFD700"];
  if(e)return <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:3}}>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <button onMouseDown={ev=>{ev.preventDefault();setB(x=>!x);}} style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${b?T.lime:T.border}`,background:b?`${T.lime}22`:"transparent",color:b?T.lime:T.ghost,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FB,flexShrink:0}}>B</button>
      <button onMouseDown={ev=>{ev.preventDefault();setIt(x=>!x);}} style={{padding:"2px 8px",borderRadius:5,border:`1px solid ${it?T.lime:T.border}`,background:it?`${T.lime}22`:"transparent",color:it?T.lime:T.ghost,cursor:"pointer",fontSize:12,fontStyle:"italic",fontFamily:FB,flexShrink:0}}>I</button>
      <input autoFocus value={v} onChange={x=>setV(x.target.value)} onBlur={()=>setTimeout(commit,150)} onKeyDown={x=>{if(x.key==="Enter")commit();if(x.key==="Escape")setE(false);}} style={{fontSize:12,color:col,background:"transparent",border:"none",borderBottom:`1px solid ${T.lime}`,outline:"none",fontFamily:FB,fontStyle:fs,fontWeight:fw,width:200,padding:"1px 0"}}/>
      <span style={{fontSize:10,color:T.lime,cursor:"pointer",flexShrink:0}} onMouseDown={ev=>{ev.preventDefault();commit();}}>✓</span>
    </div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",paddingLeft:2}}>
      {TPAL.map(c=><div key={c} onMouseDown={ev=>{ev.preventDefault();setCol(c);}} style={{width:16,height:16,borderRadius:"50%",background:c,cursor:"pointer",outline:col===c?`2px solid ${T.lime}`:"2px solid transparent",outlineOffset:2,flexShrink:0}}/>)}
    </div>
  </div>;
  return <div onClick={openEdit} style={{fontSize:12,color:tc,marginTop:3,fontStyle:fs,fontWeight:fw,cursor:"text",display:"inline-flex",alignItems:"center",gap:5}}>{value}<span style={{fontSize:9,opacity:0.4}}>✎</span></div>;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
const USERS = {
  admin:  { password:"admin96#",  role:"admin" },
  ninja:  { password:"ninja12345", role:"staff" },
};

const LOGO_B64 = "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QEIcskEk0YEIoAwkQw0UIEog0kcQ8gAUYoQww4UUA0gwUIcYAUMoQossAs8oQoIMYQoUIQgMgUssUEkMM8UMQYIoosQ6IcmSqeq+iSiOSKWy4+YsSMIoosAQ4wwk2u99989999899999999999da2ks0sMMMQs2999999999999999999999999OocU0888O0//wDf/ff/AP8A99999999/wDfffffffc0sIAOJOvf/wD/AP8A/wD/AP8A/wD/AP8Afffff/8A/wD/AP8A/wB99YoGM0QE/wDff/8A/wD/AP8A/wD/AP8A33//AN9//wD/AP8A/wD/AP8AscQAMa+9999//wD/AL//AP8AfPPfPPPPff8A3/8A/wD/APYYTAR5X33mAH9X/H0jcqFIFLn/AB0v98+9/wD+eGMHNnvf6ASdsJVTqmb1uvAkrCGrQG3P/wD/ANk4wYQ8/wD7AYYgA6v1v+/aVPdjuaxjAlv/AP8AtsAwYM8//wDAVPqX1n1r73/VvUxvgAtovf8A/wD/APrDNMNf/wD4HzKm9b7rv/lN6hp8sIIrdT//AP8AUoPsHvf/AOpHQKX9beevkwV6hIWEIIQDn/8A/wDXDDFPtP8A/wDBAodH8zfrrW52sAtOG6Bwr9//APelDeDvf/8A8HQMxsHoNb9ufYAT7e3bL+n33225gDwz3/8A+BBqthLQ1WDnFMnCAsYGZbr999tGAMg8f9/5JQ6UWKIfbL209VvdiI+oDB99592Qwg0+9/5BkC3rH/EjvMtLOm7Wu3cbV9999ycwoM3999I6IDIUyez9K2YmnRu+X4rB9999SWAA46998NiBCitTiUJJC9i+1yi+0rF9999ymAkE099pB1hVDV98lyCaCLDZIAxo4V9/99qW+Ie/99pBc7BEM8KR2UE8+cv/AP8AwWoX3/33SwAQ5z321NEICz7/AKJFWN999/8A/feBHff/AGazDxTrz3//APtt6Wwsw11M9999/wDfffffff8A1yZgDAiLT333/wDtGb/Cd99/99999999/wD/AH33xqzATRhD333/AP8A3TLvf/8A3333333333/30AT5RDAxwqoD33//AP8A/wD3/wD/APf/AH3333333332BZQj4BzgzjbzT3nz3333333/AN999999999gUUIAIyYIEsiYSUgU89999899999p999990CgsIsEMAEcoAG64+066i22+26q+2w+242u2uAIukw+c4oAkIUc4YYIgEskIkEMMos48Y0YoMAQ0MMs4wYIY8gYsQcgQg8Qk8gUYco08kAAk4wg2wk4A8w0ow0gscoIUMgsQsgMIM0Qc0MAYwcowYEYgMYwsUYU0McE4KEQY2YswIgAwwYQgA0AUkMU4gkk4kscEYQs40I48c4YkQgQsMwsIsw//9oADAMBAAIAAwAAABCDDgiTQigzBgTBAASwTDwChCTABTgARggTzDhjRwhwjCAiDDDBCwTTQAzBSBTjBTxDCDjzxgCCjTxTTRBRDzACjQjSCghCxARSCjRChijwRSRxhjCDDSDSjRBjRBxRjRAAyTQTDCyjCjwCRTCTADBSiSRCQxixCiSiRRjzASyDDBTygwCyTACAhxSzxRwTDhQgjRAwzTyQRQSQAwxgywxBCABrAajyARAygxy4BwSBbhIYD4yzRCQDgABAj4p/3XL3n3vbvV323333339ubrDDSTywAA4L333333333333333X33333321gCRhwAgS5J//AN/99/8A/wD33333333/AN9999999BAAAwUQKd//AN//AP8A/wD/AP8A/wD/AH3333//AP8A/wD/AP8AfdStOgEIMP8A23//AP8A3/8A/wD/AP8A33/933//APv3/wD/AP8AuUIAgeE9999//Lu//wD/AHTz3DDTz33/AN//AP8A+/JbgCz7333mM++tpueLfQ8zi9YYZKtUTL3/AP5OAMA4c9/oxPTZnRGhzq5H9CZwGt+D12//AP8A+TACx57/APshlZ1F+H9p+q89pYalG/1RQ/8A/wC9QgyQJb+v4ARXYkL9HXsSntGzQ9MOfqL/AP8A6xiPJLl//wD9CjGi3/6dMNMaNxVIMIM/F2t//lIw7RBf/wDqUiVw9i3yJsPQnpRhDDCSA6//AP8A0gzygx7/AP8A1VI3CbLStRgbF6KZjt9jT6Pe/wCvKAGizf8A/wDwZgJXVo4tgINuyOPcbPfLKvffectPDOv/AO/ZVeGKLVLPzQxzPuITWTLhCn33314zCzL3H/kkosm6ggBnRclw+/Sq3IzoL33mlIwziJz3/kOa84kPwQlhmLqRyh/PV1Db333mpzyBZX3X15dmA7bvzmL9Y5NN+SNdkgL333la7wj7j33w82IKkqeH77MAzoMvRvpXgb332kTbCRrb32kdGpQbMhw40xL9ZGFCiaxNbnf2k4oLST332lMLapw4AtPwEE5qz3+HRIEb3/33hzBzzT329PvzLPK8Enm5P332/wD991kU9/8AcNtMILlvf73becEafntUzPffff8A333/AP8Afe/TiDDLPCtPfff63e19RnXff/ffffffff8A/wB998qgMsEAQ9999vfdyx9f/wDffffffffff/fQBNKJPFMICAPfff8A/wD/APf/AN/3/wB9999999999gW4oSMooE0+809589999999/wDfffffffffYEDKGKDhNBOCOEFIFPPffffPffffafffffdgsOCDEPLFFALIhHMMtMLMsvMusFvMsguHpGIlKJsJPqBKFFOHHLPLGFNDCKGAKOGPJGGHCGFPOBPPJPNIGAFIKNNHMLEFGEPMBLKMFGBNJHCOEOjGCEKBHMFIBKHGBPDIPLKMDPJHABNAANCLFDKFKKDPLFDEMDHEPNEtJGOiCAOCGDELNKFHMMGHKGOHMLCGNNIINOBDEHDGAFEEIGDDDOJAP//EADYRAAEDAgEKBAYCAgMBAAAAAAEAAgMEBREGEiAhMTIzNDVxExVBURAUIkBhgSMwJEUlQ3BC/9oACAECAQE/AP8A1h8jWa3HBPuNOza5OvVMPVG+wei8+h9l5/B7Lz6D2Xn0PsvPoPZefQey8+h9l59B7Lz+H2Xn0PsvPofZefQey8+h9l59D7IX2BC90x9VHcad+xyZI14xacVj/XJI2MZzjgqy+BpzYVNWTTHFzkSTt08fhj/TigcFDVyxHFrkRX3H6ZlFK2Vuc0/0zztgZnPKr7lJVEtB+n7mguMlK7AnUqees7A5mqTgMSrvXGeQxt2D7u115p5M12wprg4Bw9dK7VQggw9Sicdv3llqvFhzDtGlfpi6bw/b72yTGOcN914aBVyfn1Lz94FRPzJmn8oHVoO2FVZxmdoUFhdVwiUOXlhFV8tjrT7U5tUKbFNs7nVZps5S5MPYwuztittrdWyFjThgrnazQOAJxxVRa3wQMmccc5RZMvkYHZ21PtDm1Xy2KfaXMqhTYqS0OZUimJ2qtpDSzeETijYHCn8fO9FR5POqYhIHbVJSmOfwSVU2l0ErYs7eU1odHUtpydqOSzwM7OVDanVTntxwzVQWZ1XnfVsVVB4Epjxx00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V98lyCaCLDZIAxo4V9/99qW+Ie/99pBc7BEM8KR2UE8+cv/AP8AwWoX3/33SwAQ5z321NEICz7/AKJFWN999/8A/feBHff/AGazDxTrz3//APtt6Wwsw11M9999/wDfffffff8A1yZgDAiLT333/wDtGb/Cd99/99999999/wD/AH33xqzATRhD333/AP8A3TLvf/8A3333333333/30AT5RDAxwqoD33//AP8A/wD3/wD/APf/AH3333333332BZQj4BzgzjbzT3nz3333333/AN999999999gUUIAIyYIEsiYSUgU89999899999p999990CgsIsEMAEcoAG64+066i22+26q+2w+242u2uAIukw+c4oAkIUc4YYIgEskIkEMMos48Y0YoMAQ0MMs4wYIY8gYsQcgQg8Qk8gUYco08kAAk4wg2wk4A8w0ow0gscoIUMgsQsgMIM0Qc0MAYwcowYEYgMYwsUYU0McE4KEQY2YswIgAwwYQgA0AUkMU4gkk4kscEYQs40I48c4YkQgQsMwsIsw//9oADAMBAAIAAwAAABCDDgiTQigzBgTBAASwTDwChCTABTgARggTzDhjRwhwjCAiDDDBCwTTQAzBSBTjBTxDCDjzxgCCjTxTTRBRDzACjQjSCghCxARSCjRChijwRSRxhjCDDSDSjRBjRBxRjRAAyTQTDCyjCjwCRTCTADBSiSRCQxixCiSiRRjzASyDDBTygwCyTACAhxSzxRwTDhQgjRAwzTyQRQSQAwxgywxBCABrAajyARAygxy4BwSBbhIYD4yzRCQDgABAj4p/3XL3n3vbvV323333339ubrDDSTywAA4L333333333333333X33333321gCRhwAgS5J//AN/99/8A/wD33333333/AN9999999BAAAwUQKd//AN//AP8A/wD/AP8A/wD/AH3333//AP8A/wD/AP8AfdStOgEIMP8A23//AP8A3/8A/wD/AP8A33/933//APv3/wD/AP8AuUIAgeE9999//Lu//wD/AHTz3DDTz33/AN//AP8A+/JbgCz7333mM++tpueLfQ8zi9YYZKtUTL3/AP5OAMA4c9/oxPTZnRGhzq5H9CZwGt+D12//AP8A+TACx57/APshlZ1F+H9p+q89pYalG/1RQ/8A/wC9QgyQJb+v4ARXYkL9HXsSntGzQ9MOfqL/AP8A6xiPJLl//wD9CjGi3/6dMNMaNxVIMIM/F2t//lIw7RBf/wDqUiVw9i3yJsPQnpRhDDCSA6//AP8A0gzygx7/AP8A1VI3CbLStRgbF6KZjt9jT6Pe/wCvKAGizf8A/wDwZgJXVo4tgINuyOPcbPfLKvffectPDOv/AO/ZVeGKLVLPzQxzPuITWTLhCn33314zCzL3H/kkosm6ggBnRclw+/Sq3IzoL33mlIwziJz3/kOa84kPwQlhmLqRyh/PV1Db333mpzyBZX3X15dmA7bvzmL9Y5NN+SNdkgL333la7wj7j33w82IKkqeH77MAzoMvRvpXgb332kTbCRrb32kdGpQbMhw40xL9ZGFCiaxNbnf2k4oLST332lMLapw4AtPwEE5qz3+HRIEb3/33hzBzzT329PvzLPK8Enm5P332/wD991kU9/8AcNtMILlvf73becEafntUzPffff8A333/AP8Afe/TiDDLPCtPfff63e19RnXff/ffffffff8A/wB998qgMsEAQ9999vfdyx9f/wDffffffffff/fQBNKJPFMICAPfff8A/wD/APf/AN/3/wB9999999999gW4oSMooE0+809589999999/wDfffffffffYEDKGKDhNBOCOEFIFPPffffPffffafffffdgsOCDEPLFFALIhHMMtMLMsvMusFvMsguHpGIlKJsJPqBKFFOHHLPLGFNDCKGAKOGPJGGHCGFPOBPPJPNIGAFIKNNHMLEFGEPMBLKMFGBNJHCOEOjGCEKBHMFIBKHGBPDIPLKMDPJHABNAANCLFDKFKKDPLFDEMDHEPNEtJGOiCAOCGDELNKFHMMGHKGOHMLCGNNIINOBDEHDGAFEEIGDDDOJAP//EACoQAAIABQMDBAMBAQEAAAAAAAABEBEhUaExYfBBkfEgMHGxgcHh0VBA/9oACAEBAAE/ITOUMlRy4ZMNb5UND5FDLhnw1PlDQvZCH6UD6UMleuk0IMdHLerMxEch6qTBRyXqTMEKOQoZKjlwy4anyoZ0c8mZcNf5UMd6eyYfShkxzfQmgJmOi3dehNKDEezUJho5r0pkzBR8oPSWGL+IJuU6Qv7h5wTSYqtwDcVVkeUEJrkaM8YT4POHlBUJmrcEaW105yPOCkxyNGeMFGJZpHnB/wBwWjbKbZ4Qdp02uh5wnNcrRnjBNinSF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";

function LoginScreen({onLogin}){
  const[user,setUser]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState(false);
  const[show,setShow]=useState(false);
  const submit=()=>{
    const u=USERS[user.trim()];
    if(u&&pass===u.password){onLogin(user.trim(),u.role);}
    else{setErr(true);setTimeout(()=>setErr(false),2500);}
  };
  return <div style={{fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:T.bg}}>
    <div style={{background:T.surface,borderRadius:20,border:`1px solid ${T.border}`,padding:"40px 36px",width:400,boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:8}}>
          <img src={`data:image/jpeg;base64,${LOGO_B64}`} alt="ReLoop" style={{width:52,height:52,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
          <div style={{lineHeight:1}}>
            <span style={{fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif",fontSize:44,fontWeight:400,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Re</span>
            <span style={{fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif",fontSize:44,fontWeight:700,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Loop</span>
          </div>
        </div>
        <div style={{fontSize:12,color:T.ghost}}>Inventory Management Platform</div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontFamily:FB}}>Username</label>
        <input value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter username" style={{...INP,background:T.card}}/>
      </div>
      <div style={{marginBottom:24,position:"relative"}}>
        <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontFamily:FB}}>Password</label>
        <div style={{position:"relative"}}>
          <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} type={show?"text":"password"} placeholder="Enter password" style={{...INP,background:T.card,paddingRight:40}}/>
          <button onMouseDown={e=>{e.preventDefault();setShow(s=>!s);}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,padding:0}}>{show?"🙈":"👁"}</button>
        </div>
      </div>
      {err&&<div style={{background:T.rougeBg,border:`1px solid ${T.rougeText}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:T.rougeText,marginBottom:16,textAlign:"center",fontFamily:FB}}>Incorrect username or password</div>}
      <button onClick={submit} style={{width:"100%",padding:"11px",border:"none",borderRadius:10,background:T.lime,color:T.ink,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:FB}}>Sign in</button>
    </div>
  </div>;
}

export default function App(){
  const[authed,setAuthed]=useState(()=>!!localStorage.getItem("rl_auth"));
  const[role,setRole]=useState(()=>localStorage.getItem("rl_role")||"");
  const isAdmin=role==="admin";
  if(!authed)return <LoginScreen onLogin={(u,r)=>{localStorage.setItem("rl_auth","1");localStorage.setItem("rl_role",r);setAuthed(true);setRole(r);}}/>;
  useEffect(()=>{
    const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700&family=Google+Sans:wght@400;500;700&display=swap";document.head.appendChild(l);
  },[]);

  const[brands,setBrands]=useState(initBrands);
  const[items,setItems]=useState(initItems);
  const[nid,setNid]=useState(7);
  const[catTree,setCatTree]=useState({encore:{...BRAND_CATS.encore},generic:{...GENERIC_CATS}});
  const[fixes,setFixes]=useState([]);
  const[rates,setRates]=useState(DEFAULT_RATES);
  const[bundles,setBundles]=useState([]);
  const[loaded,setLoaded]=useState(false);

  const[aBrand,setABrand]=useState("all");
  const[aStat,setAStat]=useState("all");
  const[q,setQ]=useState("");
  const[sortCol,setSortCol]=useState(null);
  const[sortDir,setSortDir]=useState(1);
  const[addItemOpen,setAddItemOpen]=useState(false);
  const[addBrandOpen,setAddBrandOpen]=useState(false);
  const[editItem,setEditItem]=useState(null);
  const[detail,setDetail]=useState(null);
  const[savedTick,setSavedTick]=useState(false);
  const[activePage,setActivePage]=useState("inventory");
  const[renamingId,setRenamingId]=useState(null);
  const[renameVal,setRenameVal]=useState("");
  const[colorPickerId,setColorPickerId]=useState(null);
  const[reserveModal,setReserveModal]=useState(null);
  const[reserveData,setReserveData]=useState({name:"",platform:""});

  // ── Load from Supabase on mount ───────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      const d = await sbGet();
      if(d){
        if(d.brands?.length) setBrands(d.brands);
        if(d.items?.length)  setItems(d.items);
        if(d.nid)            setNid(d.nid);
        if(d.catTree)        setCatTree(d.catTree);
        if(d.fixes)          setFixes(d.fixes);
        if(d.rates)          setRates(d.rates);
        if(d.bundles)        setBundles(d.bundles);
      } else {
        // Nothing in Supabase yet — persist the defaults immediately
        sbSet({ brands:initBrands, items:initItems, nid:7, catTree:{encore:{...BRAND_CATS.encore},generic:{...GENERIC_CATS}}, fixes:[], rates:DEFAULT_RATES, bundles:[] });
      }
      setLoaded(true);
    })();
  },[]);

  // ── Persist to Supabase whenever state changes ────────────────────────────
  const persist = (overrides={}) => {
    sbSet({ brands, items, nid, catTree, fixes, rates, bundles, ...overrides });
  };
  useEffect(()=>{ if(!loaded) return; persist(); },[brands,items,nid,catTree,fixes,rates,bundles,loaded]);

  const saveBrands = next => {
    setBrands(next);
    // Use setTimeout to let React flush state before we read it
    setTimeout(() => {
      sbSet({ brands:next, items, nid, catTree, fixes, rates, bundles });
    }, 100);
  };

  const toPKR=(amount,currency)=>{if(!amount)return 0;if(currency==="PKR"||!currency)return amount;return Math.round(amount*(rates[currency]||1));};

  useEffect(()=>{if(!loaded)return;setSavedTick(true);const t=setTimeout(()=>setSavedTick(false),1800);return()=>clearTimeout(t);},[brands,items]);

  const gb=id=>brands.find(b=>b.id===id);
  const pool=useMemo(()=>aBrand==="all"?items:items.filter(i=>i.brand===aBrand),[items,aBrand]);
  const filtered=useMemo(()=>{
    let f=pool;
    if(aStat!=="all")f=f.filter(i=>i.status===aStat);
    if(q)f=f.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())||i.sku?.toLowerCase().includes(q.toLowerCase())||(i.category||"").toLowerCase().includes(q.toLowerCase())||(i.notes||"").toLowerCase().includes(q.toLowerCase()));
    if(sortCol)f=[...f].sort((a,b)=>{let av=sortCol==="profit"?toPKR(a.price,a.currency)-a.cost:sortCol==="brand"?(gb(a.brand)?.name||""):a[sortCol]||"";let bv=sortCol==="profit"?toPKR(b.price,b.currency)-b.cost:sortCol==="brand"?(gb(b.brand)?.name||""):b[sortCol]||"";if(typeof av==="number")return(av-bv)*sortDir;return String(av).localeCompare(String(bv))*sortDir;});
    return f;
  },[pool,aStat,q,sortCol,sortDir,brands,rates]);

  const stats=useMemo(()=>({
    total:pool.reduce((s,i)=>s+(i.qty||1),0),
    avail:pool.filter(i=>i.status==="available"||i.status==="listed").reduce((s,i)=>s+(i.qty||1),0),
    sold:pool.filter(i=>i.status==="sold").reduce((s,i)=>s+(i.qty||1),0),
    val:pool.filter(i=>i.status!=="sold").reduce((s,i)=>s+(i.cost||0)*(i.qty||1),0),
    profit:pool.filter(i=>i.status==="sold").reduce((s,i)=>s+(toPKR(i.price,i.currency)-(i.cost||0))*(i.qty||1),0),
  }),[pool,rates]);

  const handleSort=col=>{if(sortCol===col)setSortDir(d=>d*-1);else{setSortCol(col);setSortDir(1);}};
  const SortArrow=({col})=>sortCol===col?<span style={{fontSize:9,color:T.lime}}>{sortDir===1?"↑":"↓"}</span>:<span style={{fontSize:9,color:T.ghost,opacity:0.4}}>↕</span>;

  const startRename=(e,b)=>{e.stopPropagation();setColorPickerId(null);setRenamingId(b.id);setRenameVal(b.name);};
  const commitRename=()=>{if(renameVal.trim())saveBrands(brands.map(b=>b.id===renamingId?{...b,name:renameVal.trim()}:b));setRenamingId(null);};
  const recolorBrand=(id,color)=>{saveBrands(brands.map(b=>b.id===id?{...b,color}:b));setColorPickerId(null);};

  const saveNewItem=d=>{const today=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"});setItems(p=>[...p,{id:nid,...d,dateAdded:today}]);setNid(n=>n+1);setAddItemOpen(false);};
  const saveEdit=d=>{setItems(p=>p.map(i=>i.id===editItem.id?{...i,...d}:i));setEditItem(null);if(detail?.id===editItem.id)setDetail(prev=>({...prev,...d}));};
  const delItem=id=>{
    const next=items.filter(i=>i.id!==id);
    setItems(next);
    if(detail?.id===id)setDetail(null);
    sbSet({brands,items:next,nid,catTree,fixes,rates,bundles});
  };
  const chStatus=(id,s)=>{setItems(p=>p.map(i=>i.id===id?{...i,status:s}:i));setDetail(prev=>prev?.id===id?{...prev,status:s}:prev);};
  const handleStatusChange=(id,ns)=>{if(ns==="reserved"){setReserveModal(id);setReserveData({name:"",platform:""});}else chStatus(id,ns);};
  const submitReserve=()=>{if(!reserveModal)return;setItems(p=>p.map(i=>i.id===reserveModal?{...i,status:"reserved",reservedFor:reserveData.name,reservedPlatform:reserveData.platform}:i));setDetail(prev=>prev?.id===reserveModal?{...prev,status:"reserved",reservedFor:reserveData.name,reservedPlatform:reserveData.platform}:prev);setReserveModal(null);};

  const curBrand=aBrand!=="all"?gb(aBrand):null;
  const sizeLabel=it=>{if(!it.sizeMin&&!it.sizeMax)return"—";if(it.sizeMin===it.sizeMax||!it.sizeMax)return it.sizeMin||it.sizeMax;return`${it.sizeMin}–${it.sizeMax}`;};

  return(
    <div onClick={()=>setColorPickerId(null)} style={{fontFamily:FB,display:"flex",height:640,background:T.bg,borderRadius:16,overflow:"hidden",position:"relative",border:`1px solid ${T.border}`,width:"100%"}}>

      {/* SIDEBAR */}
      <aside style={{width:218,flexShrink:0,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"20px 18px 14px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{lineHeight:1}}>
            <span style={{fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif",fontSize:32,fontWeight:400,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Re</span>
            <span style={{fontFamily:"'Barlow Condensed','Arial Narrow',sans-serif",fontSize:32,fontWeight:700,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Loop</span>
          </div>
          <div style={{fontSize:10.5,color:T.ghost,marginTop:4}}>Inventory Management Platform</div>
          <div style={{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:isAdmin?`${T.lime}22`:T.cobaltBg,color:isAdmin?T.lime:T.cobaltText,fontWeight:600,border:`1px solid ${isAdmin?T.lime:T.cobaltText}44`}}>{isAdmin?"Admin":"Staff"}</span>
            <button onClick={()=>{localStorage.removeItem("rl_auth");localStorage.removeItem("rl_role");window.location.reload();}} style={{fontSize:10,color:T.ghost,background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:FB}}>Sign out</button>
          </div>
        </div>

        <div style={{padding:"14px 14px 10px",overflowY:"auto",flex:1}}>
          <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1.2px",color:T.ghost,marginBottom:9,fontWeight:600}}>Verticals</div>
          {[{id:"all",name:"All brands",color:T.ghost},...brands].map(b=>(
            <div key={b.id} style={{position:"relative",marginBottom:2}}>
              {renamingId===b.id
                ?<div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:8,background:T.card,border:`1px solid ${T.lime}60`}}><div style={{width:7,height:7,borderRadius:"50%",background:b.color,flexShrink:0}}/><input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")commitRename();if(e.key==="Escape")setRenamingId(null);}} onBlur={commitRename} style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:12.5,color:T.offWhite,fontFamily:FB,minWidth:0}}/><span style={{fontSize:10,color:T.lime,cursor:"pointer"}} onClick={commitRename}>✓</span></div>
                :<button onClick={()=>{setColorPickerId(null);setABrand(b.id);setActivePage("inventory");}} onDoubleClick={b.id!=="all"?e=>startRename(e,b):undefined}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:8,border:"none",background:(aBrand===b.id&&activePage==="inventory")?T.card:"transparent",cursor:"pointer",width:"100%",textAlign:"left",fontSize:12.5,color:(aBrand===b.id&&activePage==="inventory")?T.offWhite:T.muted,fontWeight:(aBrand===b.id&&activePage==="inventory")?500:400,fontFamily:FB}}>
                  <div onClick={b.id!=="all"?e=>{e.stopPropagation();setColorPickerId(colorPickerId===b.id?null:b.id);}:undefined} style={{width:10,height:10,borderRadius:"50%",background:b.color,flexShrink:0,cursor:b.id!=="all"?"pointer":"default",outline:colorPickerId===b.id?`2px solid ${T.offWhite}`:"none",outlineOffset:1}}/>
                  <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</span>
                  {b.id!=="all"&&<span onClick={e=>startRename(e,b)} style={{opacity:0,fontSize:11,color:T.ghost,cursor:"pointer",padding:"0 2px"}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0"}>✎</span>}
                  <span style={{flexShrink:0,fontSize:10,color:T.ghost,background:T.card,padding:"1px 6px",borderRadius:20}}>{b.id==="all"?items.length:items.filter(i=>i.brand===b.id).length}</span>
                </button>}
              {colorPickerId===b.id&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:10,top:"calc(100% + 6px)",zIndex:200,background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:8,width:174,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}><div style={{width:"100%",fontSize:9.5,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:2,fontWeight:600}}>Pick colour</div>{PALETTE.map(c=><div key={c} onClick={()=>recolorBrand(b.id,c)} style={{width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",outline:b.color===c?`2px solid ${T.white}`:"2px solid transparent",outlineOffset:2}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>)}</div>}
            </div>
          ))}
          <button onClick={()=>setAddBrandOpen(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:7,background:"transparent",border:`1px dashed ${T.border}`,cursor:"pointer",width:"100%",fontSize:12,color:T.ghost,fontFamily:FB,marginTop:8}}>
            <span style={{color:T.lime,fontWeight:700,fontSize:14}}>+</span> Add brand
          </button>

          <div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1.2px",color:T.ghost,marginBottom:9,fontWeight:600,marginTop:16}}>Modules</div>
          {[{icon:"🗂",label:"Inventory",page:"inventory"},{icon:"🗃️",label:"Category Tree",page:"categories"},{icon:"🧵",label:"Jobs",page:"fixes"},{icon:"📦",label:"Bundles",page:"bundles"},{icon:"💱",label:"Conversion",page:"conversion"},{icon:"🧾",label:"Sales ↗",page:null},{icon:"📊",label:"Analytics ↗",page:null},{icon:"🤝",label:"Suppliers ↗",page:null}].map(n=>(
            <button key={n.label} onClick={n.page?()=>setActivePage(n.page):undefined}
              style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:8,border:"none",background:activePage===n.page?T.card:"transparent",cursor:n.page?"pointer":"default",width:"100%",textAlign:"left",fontSize:12.5,color:activePage===n.page?T.lime:T.muted,fontFamily:FB,marginBottom:2,fontWeight:activePage===n.page?500:400}}>
              <span style={{fontSize:14}}>{n.icon}</span>{n.label}
              {activePage===n.page&&<span style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:T.lime,display:"inline-block"}}/>}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:T.bg}}>
        {activePage==="categories"?<CategoriesPage catTree={catTree} setCatTree={setCatTree} brands={brands}/>
        :activePage==="fixes"?<FixesPage fixes={fixes} setFixes={setFixes} items={items} brands={brands}/>
        :activePage==="bundles"?<BundlesPage items={items} bundles={bundles} setBundles={setBundles} brands={brands}/>
        :activePage==="conversion"?<ConversionPage rates={rates} setRates={r=>{setRates(r);sbSet({brands,items,nid,catTree,fixes,rates:r,bundles});}}/>
        :(
          <>
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
                <div>
                  <div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,lineHeight:1.1}}>{curBrand?curBrand.name:"All Inventory"}</div>
                  {curBrand&&<EditableTagline value={curBrand.tagline} bold={curBrand.taglineBold} italic={curBrand.taglineItalic} color={curBrand.taglineColor} onChange={(v,b,it,c)=>saveBrands(brands.map(br=>br.id===curBrand.id?{...br,tagline:v,taglineBold:b,taglineItalic:it,taglineColor:c}:br))}/>}
                </div>
                {savedTick&&<span style={{fontSize:11,color:T.lime,display:"flex",alignItems:"center",gap:4}}>✓ Saved</span>}
              </div>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:T.ghost,pointerEvents:"none"}}>⌕</span>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search items…" style={{padding:"7px 12px 7px 30px",border:`1px solid ${T.border}`,borderRadius:9,background:T.card,fontSize:12.5,fontFamily:FB,color:T.offWhite,width:200,outline:"none"}}/>
              </div>
              <button onClick={()=>setAddItemOpen(true)} style={{padding:"7px 20px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Add item</button>
            </div>

            <div style={{padding:"18px 20px",flex:1,overflowY:"auto",background:"#FFF"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
                {[{label:"Total pieces",val:stats.total,sub:`${stats.avail} available`,fin:false},{label:"Inventory value",val:`₨${stats.val.toLocaleString()}`,sub:"at cost price",fin:true},{label:"Sold",val:stats.sold,sub:"items",fin:false},{label:"Profit realised",val:`₨${stats.profit.toLocaleString()}`,sub:"from sold",accent:stats.profit>=0?T.profit:T.loss,fin:true}].map(s=>(
                  <div key={s.label} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9.5,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>{s.label}</div>
                    <div style={{fontSize:24,fontWeight:700,fontFamily:FD,color:s.accent||T.lime}}>{s.fin&&!isAdmin?"*****":s.val}</div>
                    <div style={{fontSize:10.5,color:T.ghost,marginTop:3}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center"}}>
                {["all","available","listed","reserved","sold"].map(s=>(
                  <button key={s} onClick={()=>setAStat(s)} style={{padding:"5px 14px",borderRadius:20,fontSize:12,border:`1px solid ${aStat===s?T.lime:T.border}`,cursor:"pointer",background:aStat===s?T.lime:T.card,color:aStat===s?T.ink:T.muted,fontFamily:FB,fontWeight:aStat===s?700:400}}>
                    {s==="all"?"All":{available:"Available",listed:"Listed",reserved:"Reserved",sold:"Sold"}[s]}
                  </button>
                ))}
                <div style={{height:16,width:1,background:T.border,margin:"0 4px"}}/>
                <span style={{fontSize:11.5,color:T.ghost}}>{filtered.length} item{filtered.length!==1?"s":""}</span>
              </div>

              {filtered.length===0
                ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:40,marginBottom:12}}>🏷️</div><div style={{fontSize:22,fontWeight:700,color:T.ghost}}>Nothing here yet</div></div>
                :<div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflowX:"auto"}}>
                  <div style={{minWidth:TOTAL_W}}>
                    <div style={{display:"flex",alignItems:"center",padding:"0 8px",borderBottom:`1px solid ${T.border}`,background:T.card,borderRadius:"12px 12px 0 0",height:40,minWidth:TOTAL_W}}>
                      {COLS.map(col=>(
                        <TCell key={col.key} w={col.w} left={col.key==="name"||col.key==="notes"}>
                          <div onClick={col.key!=="actions"?()=>handleSort(col.key):undefined}
                            style={{display:"flex",alignItems:"center",gap:3,cursor:col.key!=="actions"?"pointer":"default",userSelect:"none",fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:sortCol===col.key?T.lime:T.ghost,fontWeight:600}}>
                            {col.label}{col.key!=="actions"&&col.label&&<SortArrow col={col.key}/>}
                          </div>
                        </TCell>
                      ))}
                    </div>
                    {filtered.map((it,idx)=>{
                      const b=gb(it.brand),bc=b?.color||T.lime;
                      const pricePKR=toPKR(it.price,it.currency);
                      const prof=pricePKR-it.cost;
                      const isLast=idx===filtered.length-1;
                      const sym=CURRENCIES.find(c=>c.code===(it.currency||"PKR"))?.symbol||"₨";
                      return(
                        <div key={it.id} onClick={()=>setDetail(it)}
                          onMouseEnter={e=>{if(detail?.id!==it.id)e.currentTarget.style.background=T.card;}}
                          onMouseLeave={e=>{if(detail?.id!==it.id)e.currentTarget.style.background="transparent";}}
                          style={{display:"flex",alignItems:"center",padding:"0 8px",borderBottom:isLast?"none":`1px solid ${T.border}`,cursor:"pointer",background:detail?.id===it.id?T.cardHov:"transparent",transition:"background 0.12s",minHeight:52}}>
                          <TCell w={COLS[0].w}><span style={{fontSize:11,color:T.ghost,fontFamily:"monospace",letterSpacing:"0.2px"}}>{it.dateAdded||"—"}</span></TCell>
                          <TCell w={COLS[1].w} left><span style={{fontSize:13,fontWeight:500,color:T.offWhite,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block",width:"100%"}}>{it.name}</span></TCell>
                          <TCell w={COLS[2].w}><span style={{fontSize:11,fontWeight:600,color:bc}}>{b?.name}</span></TCell>
                          <TCell w={COLS[3].w}><span style={{fontSize:12,color:T.muted}}>{it.category}</span></TCell>
                          <TCell w={COLS[4].w}><span style={{fontSize:12,color:T.muted}}>{it.subcategory||"—"}</span></TCell>
                          <TCell w={COLS[5].w}>{(it.qty||1)>1?<span style={{fontSize:11,fontWeight:700,color:T.cobaltText,background:T.cobaltBg,padding:"2px 6px",borderRadius:6}}>×{it.qty}</span>:<span style={{fontSize:12,color:T.ghost}}>1</span>}</TCell>
                          <TCell w={COLS[6].w}>{sizeLabel(it)==="—"?<span style={{fontSize:12,color:T.ghost}}>—</span>:<span style={{fontSize:11,fontWeight:600,color:T.cobaltText,background:T.cobaltBg,padding:"2px 8px",borderRadius:20}}>{sizeLabel(it)}</span>}</TCell>
                          <TCell w={COLS[7].w}>{it.grade?<span style={{fontSize:12,fontWeight:700,color:T.lime,background:`${T.lime}18`,padding:"2px 8px",borderRadius:6,border:`1px solid ${T.lime}30`}}>{it.grade}</span>:<span style={{color:T.ghost,fontSize:12}}>—</span>}</TCell>
                          <TCell w={COLS[8].w}><span style={{fontSize:11,color:T.ghost,fontFamily:"monospace",letterSpacing:"0.3px"}}>{it.sku||"—"}</span></TCell>
                          <TCell w={COLS[9].w}><StatusPill status={it.status}/></TCell>
                          <TCell w={COLS[10].w}><span style={{fontSize:12,color:T.muted}}>{isAdmin?`₨${it.cost.toLocaleString()}`:"*****"}</span></TCell>
                          <TCell w={COLS[11].w}><span style={{fontSize:12,fontWeight:600,color:T.offWhite}}>{isAdmin?`₨${((it.cost||0)*(it.qty||1)).toLocaleString()}`:"*****"}</span></TCell>
                          <TCell w={COLS[12].w}>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:13,fontWeight:700,color:T.lime}}>{isAdmin?`${sym}${it.price.toLocaleString()}`:"*****"}</div>
                              {isAdmin&&it.currency&&it.currency!=="PKR"&&it.price>0&&<div style={{fontSize:10,color:T.ghost}}>₨{pricePKR.toLocaleString()}</div>}
                            </div>
                          </TCell>
                          <TCell w={COLS[13].w} left><span style={{fontSize:11,color:T.ghost,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block",width:"100%"}}>{it.notes||"—"}</span></TCell>
                          <TCell w={COLS[14].w}><span style={{fontSize:12,fontWeight:700,color:prof>=0?T.profit:T.loss}}>{isAdmin?(prof>=0?"+":"")+"₨"+prof.toLocaleString():"*****"}</span></TCell>
                          <TCell w={COLS[15].w}><div style={{display:"flex",gap:6,justifyContent:"center"}}><IconBtn title="Edit" onClick={e=>{e.stopPropagation();setEditItem(it);}}/><IconBtn title="Delete" danger onClick={e=>{e.stopPropagation();delItem(it.id);}}/></div></TCell>
                        </div>
                      );
                    })}
                  </div>
                </div>}
            </div>
          </>
        )}
      </main>

      {/* DETAIL PANEL */}
      {detail&&(()=>{
        const it=items.find(i=>i.id===detail.id)||detail;
        const b=gb(it.brand),bc=b?.color||T.lime;
        const pricePKR=toPKR(it.price,it.currency);
        const prof=pricePKR-it.cost,mg=pricePKR?Math.round(prof/pricePKR*100):0;
        const sym=CURRENCIES.find(c=>c.code===(it.currency||"PKR"))?.symbol||"₨";
        return(
          <div style={{position:"absolute",top:0,right:0,width:292,height:"100%",background:T.surface,borderLeft:`1px solid ${T.border}`,zIndex:50,overflowY:"auto"}}>
            <div style={{padding:"18px 18px 16px",borderBottom:`1px solid ${T.border}`,background:T.card}}>
              <div style={{display:"flex",justifyContent:"flex-end",gap:5,marginBottom:12}}>
                <IconBtn title="Edit" onClick={()=>setEditItem(it)}/><IconBtn title="Delete" danger onClick={()=>delItem(it.id)}/><IconBtn title="Close" onClick={()=>setDetail(null)}/>
              </div>
              <div style={{display:"inline-block",fontSize:9.5,textTransform:"uppercase",letterSpacing:"1px",padding:"3px 9px",borderRadius:20,background:`${bc}25`,color:bc,marginBottom:7,fontWeight:700,border:`1px solid ${bc}40`}}>{b?.name}</div>
              <div style={{fontFamily:FD,fontSize:18,fontWeight:700,color:T.offWhite,lineHeight:1.25,marginBottom:8}}>{it.name}</div>
              <StatusPill status={it.status}/>
            </div>
            <div style={{margin:"14px 16px 0",background:T.card,borderRadius:10,padding:"13px 15px",border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between"}}>
              <div><div style={{fontSize:9.5,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>Cost</div><div style={{fontSize:16,fontWeight:700,color:T.muted}}>{isAdmin?`₨${it.cost.toLocaleString()}`:"*****"}</div></div>
              {it.status==="sold"&&<div style={{textAlign:"right"}}><div style={{fontSize:9.5,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>Profit</div><div style={{fontSize:18,fontWeight:700,color:prof>=0?T.profit:T.loss}}>{isAdmin?(prof>=0?"+":"")+"₨"+prof.toLocaleString():"*****"}</div>{isAdmin&&<div style={{fontSize:10,color:T.ghost}}>{mg}%</div>}</div>}
            </div>
            <div style={{padding:"12px 16px"}}>
              {[["SKU",it.sku||"—"],(it.qty||1)>1&&["Qty",it.qty],["Category",it.category],["Subcat",it.subcategory||"—"],["Size",sizeLabel(it)],it.grade&&["Grade",it.grade],it.dateAdded&&["Date added",it.dateAdded],isAdmin&&["Total value",`₨${((it.cost||0)*(it.qty||1)).toLocaleString()}`],it.notes&&["Notes",it.notes],it.status==="reserved"&&it.reservedFor&&["Reserved for",it.reservedFor],it.status==="reserved"&&it.reservedPlatform&&["Via",it.reservedPlatform]].filter(Boolean).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:11.5,color:T.ghost}}>{k}</span>
                  <span style={{fontSize:12.5,fontWeight:500,color:T.offWhite,textAlign:"right",maxWidth:160}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:14}}>
                <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px"}}>Update status</label>
                <select value={it.status} onChange={e=>handleStatusChange(it.id,e.target.value)} style={{...INP,background:T.card}}>{Object.entries(STLBL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
              </div>
              {it.status==="sold"&&isAdmin&&(
                <div style={{marginTop:12,padding:14,background:T.bg,borderRadius:10,border:`1px solid ${T.rougeBg}`}}>
                  <div style={{fontSize:10,color:T.rougeText,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,marginBottom:12}}>Sale details</div>
                  <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px"}}>Sold price — per piece</label>
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    <select value={it.currency||"PKR"} onChange={e=>{setItems(p=>p.map(i=>i.id===it.id?{...i,currency:e.target.value}:i));setDetail(prev=>({...prev,currency:e.target.value}));}} style={{...INP,width:76,flexShrink:0,fontWeight:600,color:T.lime,background:T.card}}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                    <input type="number" style={{...INP,flex:1,background:T.card}} value={it.price||""} onChange={e=>{const v=parseInt(e.target.value)||0;setItems(p=>p.map(i=>i.id===it.id?{...i,price:v}:i));setDetail(prev=>({...prev,price:v}));}} placeholder="Enter sold price…"/>
                  </div>
                  {it.currency&&it.currency!=="PKR"&&it.price>0&&<div style={{fontSize:11,color:T.ghost,marginBottom:10}}>= ₨{toPKR(it.price,it.currency).toLocaleString()} PKR</div>}
                  <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.9px"}}>Sold on platform</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{PLATFORMS.map(p=>{const a=it.soldOn===p;return <button key={p} onClick={()=>{setItems(prev=>prev.map(i=>i.id===it.id?{...i,soldOn:a?null:p}:i));setDetail(prev=>({...prev,soldOn:a?null:p}));}} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontFamily:FB,cursor:"pointer",border:`1px solid ${a?T.lime:T.border}`,background:a?T.lime+"22":"transparent",color:a?T.lime:T.muted,fontWeight:a?600:400}}>{a&&<span style={{marginRight:4,fontSize:9}}>✓</span>}{p}</button>;})}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODALS */}
      <Modal open={addItemOpen} onClose={()=>setAddItemOpen(false)} title="Add item">
        <ItemForm brands={brands} defaultBrand={aBrand!=="all"?aBrand:undefined} onSave={saveNewItem} onClose={()=>setAddItemOpen(false)} allItems={items} catTree={catTree} onCatTreeChange={(k,m)=>setCatTree(p=>({...p,[k]:m}))}/>
      </Modal>
      <Modal open={!!editItem} onClose={()=>setEditItem(null)} title="Edit item">
        {editItem&&<ItemForm brands={brands} initial={editItem} onSave={saveEdit} onClose={()=>setEditItem(null)} allItems={items} catTree={catTree} onCatTreeChange={(k,m)=>setCatTree(p=>({...p,[k]:m}))}/>}
      </Modal>
      <Modal open={addBrandOpen} onClose={()=>setAddBrandOpen(false)} title="New brand">
        <BrandForm onSave={b=>{saveBrands([...brands,b]);setAddBrandOpen(false);}} onClose={()=>setAddBrandOpen(false)}/>
      </Modal>

      {/* RESERVE MODAL */}
      {reserveModal&&(
        <div onClick={()=>setReserveModal(null)} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:420,maxWidth:"96vw",padding:26}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div style={{fontFamily:FD,fontSize:22,fontWeight:700,color:T.amberText}}>🔒 Reserve item</div><button onClick={()=>setReserveModal(null)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>
            <div style={{marginBottom:13}}><label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px"}}>Customer name</label><input style={INP} value={reserveData.name} onChange={e=>setReserveData(p=>({...p,name:e.target.value}))} placeholder="e.g. Aisha Khan"/></div>
            <div style={{marginBottom:16}}><label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.9px"}}>Platform</label><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{PLATFORMS.map(p=>{const a=reserveData.platform===p;return <button key={p} type="button" onClick={()=>setReserveData(prev=>({...prev,platform:a?"":p}))} style={{padding:"6px 14px",borderRadius:20,fontSize:12.5,cursor:"pointer",fontFamily:FB,border:`1px solid ${a?T.amberText:T.border}`,background:a?`${T.amberText}22`:"transparent",color:a?T.amberText:T.muted,fontWeight:a?600:400}}>{a&&<span style={{marginRight:4,fontSize:10}}>✓</span>}{p}</button>;})}</div></div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
              <button onClick={()=>setReserveModal(null)} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
              <button onClick={submitReserve} style={{padding:"8px 20px",border:"none",borderRadius:8,background:T.amberText,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Confirm reservation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
