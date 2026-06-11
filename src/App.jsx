// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { useState, useMemo, useEffect, useRef } from "react";

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
  {key:"price",   label:"Sold",     w:90},
  {key:"notes",   label:"Notes",    w:160},
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
// ── Hoisted helpers (module-level to prevent focus loss on re-render) ─────────
function FR({label,children}){return <div style={{marginBottom:12}}><label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.9px",fontFamily:FB}}>{label}</label>{children}</div>;}
function Sug({s,pick,clear}){if(!s||s.length===0)return null;return <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,marginTop:3,overflow:"hidden",boxShadow:"0 6px 20px rgba(0,0,0,0.35)"}}>{s.map(x=><div key={x} onMouseDown={()=>{pick(x);clear();}} style={{padding:"8px 12px",fontSize:12.5,color:T.offWhite,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{x}</div>)}</div>;}
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

// ── Collapsible Section Header ────────────────────────────────────────────────
function SectionHeader({ label, collapsed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        width:"100%", background:"none", border:"none", cursor:"pointer",
        padding:"0 4px", marginBottom: collapsed ? 4 : 9,
      }}
    >
      <span style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1.2px",color:T.ghost,fontWeight:600,fontFamily:FB}}>{label}</span>
      <span style={{
        fontSize:9, color:T.ghost, lineHeight:1,
        transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        transition:"transform 0.18s", display:"inline-block",
      }}>▼</span>
    </button>
  );
}

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
  const[f,setF]=useState(()=>{if(initial)return initial;return{brand:dbid,name:"",productBrand:"",category:fCat,subcategory:"",grade:"",sizeMin:"",sizeMax:"",qty:1,supplierName:"",supplierArea:"",inventoryDate:new Date().toISOString().slice(0,10),cost:"",price:"",currency:"PKR",status:"available",sku:nextSku(dbid,dbo?.name||"",fCat,"",allItems),notes:"",platforms:[]};});
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
    <Field label="Date of Inventory"><input style={INP} type="date" value={f.inventoryDate||""} onChange={e=>set("inventoryDate",e.target.value)}/></Field>
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
  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}><div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px"}}><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite}}>Category Tree</div></div><div style={{flex:1,overflowY:"auto",background:T.bg,padding:20}}><div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{tabs.map(t=>{const a=selBrand===t.id||(!catTree[selBrand]&&t.id==="generic");return <button key={t.id} onClick={()=>{setSelBrand(t.id);setSelCat(null);}} style={{padding:"6px 16px",borderRadius:20,fontSize:12.5,border:`1px solid ${a?T.lime:T.border}`,background:a?T.lime:"transparent",color:a?T.ink:T.muted,cursor:"pointer",fontFamily:FB,fontWeight:a?700:400}}>{t.label}</button>;})}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr",gap:0}}><div style={{paddingRight:20}}><div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1px",color:T.ghost,marginBottom:10,fontWeight:600}}>Categories</div><div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:12}}>{cats.length===0&&<div style={{padding:"16px 12px",fontSize:12,color:T.ghost,textAlign:"center"}}>No categories yet</div>}{cats.map(c=><div key={c} onClick={()=>setSelCat(c)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:selCat===c?T.card:"transparent",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}>{eCat===c?<><input autoFocus value={eCatV} onChange={e=>setECatV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renCat(c);if(e.key==="Escape")setECat(null);}} onBlur={()=>renCat(c)} onClick={e=>e.stopPropagation()} style={II}/><span style={{fontSize:11,color:T.lime,cursor:"pointer"}} onClick={e=>{e.stopPropagation();renCat(c);}}>✓</span></>:<><span style={{fontSize:13,color:selCat===c?T.offWhite:T.muted,fontWeight:selCat===c?500:400,flex:1}}>{c}</span><span style={{fontSize:10,color:T.ghost,background:T.bg,padding:"1px 6px",borderRadius:20}}>{(cm[c]||[]).length}</span><button onClick={e=>{e.stopPropagation();setECat(c);setECatV(c);}} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:12,padding:"0 2px",opacity:0.6}}>✎</button><button onClick={e=>{e.stopPropagation();delCat(c);}} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,padding:"0 2px"}}>✕</button></>}</div>)}</div><div style={{display:"flex",gap:8}}><input value={nCat} onChange={e=>setNCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()} placeholder="New category…" style={I2}/><button onClick={addCat} style={AB}>Add</button></div></div><div style={{background:T.border,alignSelf:"stretch",minHeight:400}}/><div style={{paddingLeft:20}}><div style={{fontSize:9.5,textTransform:"uppercase",letterSpacing:"1px",color:T.ghost,marginBottom:10,fontWeight:600}}>{selCat?`Subcategories — ${selCat}`:"Subcategories"}</div>{!selCat?<div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,padding:"40px 20px",textAlign:"center"}}><div style={{fontSize:13,color:T.ghost}}>← Select a category</div></div>:<><div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:12}}>{subs.length===0&&<div style={{padding:"16px 12px",fontSize:12,color:T.ghost}}>No subcategories yet</div>}{subs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>{eSub?.cat===selCat&&eSub?.idx===i?<><input autoFocus value={eSubV} onChange={e=>setESubV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")renSub(i);if(e.key==="Escape")setESub(null);}} onBlur={()=>renSub(i)} style={II}/><span style={{fontSize:11,color:T.lime,cursor:"pointer"}} onClick={()=>renSub(i)}>✓</span></>:<><span style={{fontSize:13,color:T.muted,flex:1}}>{s}</span>{NO_SIZE_SUBCATS.has(s)&&<span style={{fontSize:9.5,color:T.amberText,background:T.amberBg,padding:"1px 7px",borderRadius:10,fontWeight:600}}>No size</span>}<span style={{fontSize:10,color:T.ghost,background:T.bg,padding:"1px 6px",borderRadius:20}}>{i+1}</span><button onClick={()=>{setESub({cat:selCat,idx:i});setESubV(s);}} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:12,padding:"0 2px",opacity:0.6}}>✎</button><button onClick={()=>delSub(i)} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,padding:"0 2px"}}>✕</button></>}</div>)}</div><div style={{display:"flex",gap:8}}><input value={nSub} onChange={e=>setNSub(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSub()} placeholder="New subcategory…" style={I2}/><button onClick={addSub} style={AB}>Add</button></div></>}</div></div></div></div>;
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
  const Stars=({value,onChange})=><div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(s=><span key={s} onClick={()=>onChange(s)} style={{fontSize:22,cursor:"pointer",color:s<=value?T.lime:T.ghost}}>★</span>)}</div>;
  return <div style={{display:"flex",flexDirection:"column",height:"100%"}}><div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>Jobs</div><div style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>{[{k:"log",l:"Active"},{k:"history",l:"History"}].map((t,i)=><button key={t.k} onClick={()=>setView(t.k)} style={{padding:"6px 14px",background:view===t.k?T.lime:"transparent",border:"none",borderLeft:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",fontSize:12.5,color:view===t.k?T.ink:T.muted,fontFamily:FB,fontWeight:view===t.k?700:400}}>{t.l} ({t.k==="log"?af.length:cf.length})</button>)}</div><button onClick={()=>setFormOpen(true)} style={{padding:"7px 18px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Log jobs</button></div><div style={{flex:1,overflowY:"auto",background:T.bg,padding:"18px 20px"}}>{view==="log"&&(af.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36}}>🧵</div><div style={{fontSize:18,fontWeight:600,color:T.ghost}}>No active jobs</div></div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>{af.map(fx=><div key={fx.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px",display:"grid",gridTemplateColumns:"100px 1fr 100px 80px 80px 120px 80px",gap:12,alignItems:"center"}}><div style={{fontSize:12,color:T.muted}}>{fx.date}</div><div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{fx.notes||"—"}</div><span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:`${sc(fx.type)}22`,color:sc(fx.type),border:`1px solid ${sc(fx.type)}44`}}>{fx.type}</span><div style={{fontSize:13,color:T.offWhite}}>{fx.pieces}</div><div style={{fontSize:11,fontWeight:600,color:gb(fx.brand)?.color||T.muted}}>{gb(fx.brand)?.name||"—"}</div><div style={{fontSize:12,color:T.muted}}>{fx.tailor||"—"}</div><button onClick={()=>{setRetId(fx.id);setRetData({returnedDate:new Date().toISOString().slice(0,10),rating:0,notes:""});}} style={{padding:"5px 10px",border:`1px solid ${T.lime}`,borderRadius:7,background:"transparent",color:T.lime,cursor:"pointer",fontSize:12,fontFamily:FB}}>Mark returned</button></div>)}</div>)}{view==="history"&&(cf.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36}}>📋</div><div style={{fontSize:18,fontWeight:600,color:T.ghost,marginTop:12}}>No completed fixes yet</div></div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>{cf.map(fx=><div key={fx.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 16px"}}><div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{fx.notes||"—"}</div><div style={{fontSize:11,color:T.ghost,marginTop:4}}>{fx.date} → {fx.returnedDate} · {fx.pieces} pcs</div></div>)}</div>)}</div>
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
        <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"18px 20px"}}>
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
        <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"20px 24px"}}>
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
          <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"20px 24px"}}>
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
// ── Attendance & Roles Page ───────────────────────────────────────────────────
const DEFAULT_ROLES = ["Admin","Manager","Inventory Staff","Packer","Sales","Other"];
const ABSENCE_REASONS = ["Sick","No Show","Personal","Holiday","Late","Other"];

// ── Attendance Modals (extracted to prevent focus loss on re-render) ──────────
const ROLE_COLORS_A = {"Admin":"#C8F135","Manager":"#7EB8F0","Inventory Staff":"#7ECB7E","Packer":"#F0C060","Sales":"#C070F0","Other":"#9B8FBB"};
const rca = r => ROLE_COLORS_A[r]||T.muted;
const I3s = {width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:13,fontFamily:FB,color:T.offWhite,outline:"none",boxSizing:"border-box"};

function MemberModal({ editId, roles, onAddRole, onRemoveRole, onSave, onClose }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(roles[0]||"");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [newRole, setNewRole] = useState("");
  const [managingRoles, setManagingRoles] = useState(false);

  // Keep selected role valid if roles change
  useEffect(()=>{ if(!roles.includes(role)) setRole(roles[0]||""); },[roles]);

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:460,maxWidth:"96vw",padding:26}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontFamily:FB,fontSize:20,fontWeight:700,color:T.lime}}>{editId?"Edit member":"Add team member"}</div>
          <button onClick={onClose} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FR label="Full name">
            <input style={I3s} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sara Ahmed" autoFocus/>
          </FR>
          <FR label={
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>Role</span>
              <button onClick={()=>setManagingRoles(o=>!o)} style={{fontSize:9.5,color:managingRoles?T.lime:T.ghost,background:"none",border:`1px solid ${managingRoles?T.lime:T.border}`,borderRadius:5,padding:"1px 7px",cursor:"pointer",fontFamily:FB,fontWeight:600}}>
                {managingRoles?"← Done":"⚙ Manage"}
              </button>
            </div>
          }>
            {!managingRoles
              ? <select style={I3s} value={role} onChange={e=>setRole(e.target.value)}>
                  {roles.map(r=><option key={r}>{r}</option>)}
                </select>
              : <div style={{background:T.bg,borderRadius:8,border:`1px solid ${T.border}`,padding:"8px 10px",maxHeight:160,overflowY:"auto"}}>
                  {roles.map(r=>(
                    <div key={r} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontSize:12.5,color:T.offWhite}}>{r}</span>
                      {roles.length>1&&<button onClick={()=>onRemoveRole(r)} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,lineHeight:1,padding:"0 2px"}} onMouseEnter={e=>e.currentTarget.style.color=T.rougeText} onMouseLeave={e=>e.currentTarget.style.color=T.ghost}>✕</button>}
                    </div>
                  ))}
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <input
                      value={newRole}
                      onChange={e=>setNewRole(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&newRole.trim()){onAddRole(newRole.trim());setNewRole("");}}}
                      placeholder="New role…"
                      style={{...I3s,flex:1,padding:"6px 10px",fontSize:12}}
                    />
                    <button
                      onClick={()=>{if(newRole.trim()){onAddRole(newRole.trim());setNewRole("");}}}
                      style={{padding:"6px 12px",border:"none",borderRadius:7,background:T.lime,color:T.ink,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FB,flexShrink:0}}>Add</button>
                  </div>
                </div>}
          </FR>
        </div>

        <FR label="Phone (optional)"><input style={I3s} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 0300-1234567"/></FR>
        <FR label="Notes"><input style={I3s} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any extra info…"/></FR>

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
          <button onClick={onClose} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
          <button onClick={()=>{if(!name.trim())return;onSave({name,role:role||roles[0],phone,notes});}} style={{padding:"8px 20px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>{editId?"Save changes":"Add member"}</button>
        </div>
      </div>
    </div>
  );
}

function AbsenceModal({ members, onSave, onClose }) {
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [reason, setReason] = useState("Sick");
  const [notes, setNotes] = useState("");
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:440,maxWidth:"96vw",padding:26}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontFamily:FB,fontSize:20,fontWeight:700,color:T.rougeText}}>🚫 Mark absence</div>
          <button onClick={onClose} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <FR label="Team member">
          <select style={I3s} value={memberId} onChange={e=>setMemberId(e.target.value)}>
            <option value="">— select member —</option>
            {members.map(m=><option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
          </select>
        </FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FR label="Date"><input style={I3s} type="date" value={date} onChange={e=>setDate(e.target.value)}/></FR>
          <FR label="Reason"><select style={I3s} value={reason} onChange={e=>setReason(e.target.value)}>{ABSENCE_REASONS.map(r=><option key={r}>{r}</option>)}</select></FR>
        </div>
        <FR label="Notes (optional)"><input style={I3s} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any details…"/></FR>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
          <button onClick={onClose} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
          <button onClick={()=>{if(!memberId)return;onSave({memberId:Number(memberId),date,reason,notes});}} disabled={!memberId}
            style={{padding:"8px 20px",border:"none",borderRadius:8,background:!memberId?T.border:T.rougeText,color:!memberId?T.ghost:T.white,cursor:!memberId?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Mark absent</button>
        </div>
      </div>
    </div>
  );
}

function AttendancePage({ attendance, setAttendance, isAdmin }) {
  const [view, setView] = useState("log");
  const [memberForm, setMemberForm] = useState(false);
  const [absenceForm, setAbsenceForm] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0,7));

  const [members, setMembers] = useState(()=>attendance?.members||[]);
  const [absences, setAbsences] = useState(()=>attendance?.absences||[]);
  const [roles, setRoles] = useState(()=>attendance?.roles||DEFAULT_ROLES);

  // Sync initial load from Supabase (only fires when lengths change, not on local edits)
  const prevLenRef = useRef({m:0,a:0});
  useEffect(()=>{
    const ml=attendance?.members?.length||0, al=attendance?.absences?.length||0;
    if(ml!==prevLenRef.current.m||al!==prevLenRef.current.a){
      setMembers(attendance?.members||[]);
      setAbsences(attendance?.absences||[]);
      if(attendance?.roles) setRoles(attendance.roles);
      prevLenRef.current={m:ml,a:al};
    }
  },[attendance?.members?.length, attendance?.absences?.length]);

  const flush = (m,a,r) => setAttendance({members:m, absences:a, roles:r||roles});

  const handleAddMember = data => {
    let next;
    if (editMember) {
      next = members.map(m=>m.id===editMember?{...m,...data}:m);
    } else {
      next = [...members, {id:Date.now(),...data}];
    }
    setMembers(next); flush(next, absences, roles);
    setMemberForm(false); setEditMember(null);
  };

  const handleAddAbsence = data => {
    const next = [...absences, {id:Date.now(),...data}];
    setAbsences(next); flush(members, next, roles);
    setAbsenceForm(false);
  };

  const deleteMember = id => {
    const nm=members.filter(m=>m.id!==id);
    const na=absences.filter(a=>String(a.memberId)!==String(id));
    setMembers(nm); setAbsences(na); flush(nm,na,roles);
  };

  const deleteAbsence = id => {
    const next=absences.filter(a=>a.id!==id);
    setAbsences(next); flush(members,next,roles);
  };

  const handleAddRole = r => {
    if(!r||roles.includes(r)) return;
    const next=[...roles,r]; setRoles(next); flush(members,absences,next);
  };
  const handleRemoveRole = r => {
    const next=roles.filter(x=>x!==r); setRoles(next); flush(members,absences,next);
  };

  const getMember = id => members.find(m=>String(m.id)===String(id))||{};
  const filteredAbsences = absences.filter(a=>a.date?.startsWith(filterMonth));
  const absenteeStats = members.map(m=>({
    ...m,
    total:absences.filter(a=>String(a.memberId)===String(m.id)).length,
    thisMonth:absences.filter(a=>String(a.memberId)===String(m.id)&&a.date?.startsWith(filterMonth)).length,
  })).sort((a,b)=>b.total-a.total);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{fontFamily:FB,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>Attendance & Roles</div>
        <div style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          {[{k:"log",l:"Log"},{k:"team",l:"Team"},{k:"history",l:"History"}].map((t,i)=>(
            <button key={t.k} onClick={()=>setView(t.k)} style={{padding:"6px 14px",background:view===t.k?T.lime:"transparent",border:"none",borderLeft:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",fontSize:12.5,color:view===t.k?T.ink:T.muted,fontFamily:FB,fontWeight:view===t.k?700:400}}>{t.l}</button>
          ))}
        </div>
        {view==="log"&&<button onClick={()=>setAbsenceForm(true)} style={{padding:"7px 16px",border:"none",borderRadius:9,background:T.rougeText,color:T.white,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Mark absent</button>}
        {view==="team"&&isAdmin&&<button onClick={()=>{setEditMember(null);setMemberForm(true);}} style={{padding:"7px 16px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Add member</button>}
      </div>

      <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"18px 20px"}}>
        {view==="log"&&(<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {label:"Team size",val:members.length},
              {label:"Absences this month",val:filteredAbsences.length,accent:T.rougeText},
              {label:"Most absent",val:absenteeStats[0]?.name?.split(" ")[0]||"—",sub:absenteeStats[0]?`${absenteeStats[0].total} total`:""},
              {label:"Present today",val:members.length-absences.filter(a=>a.date===new Date().toISOString().slice(0,10)).length},
            ].map(s=>(
              <div key={s.label} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9.5,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>{s.label}</div>
                <div style={{fontSize:24,fontWeight:700,color:s.accent||T.lime}}>{s.val}</div>
                {s.sub&&<div style={{fontSize:10.5,color:T.ghost,marginTop:2}}>{s.sub}</div>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <label style={{fontSize:11,color:T.ghost,fontFamily:FB}}>Showing</label>
            <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.offWhite,fontSize:12,fontFamily:FB,outline:"none"}}/>
            <span style={{fontSize:11.5,color:T.ghost}}>{filteredAbsences.length} absence{filteredAbsences.length!==1?"s":""}</span>
          </div>
          {filteredAbsences.length===0
            ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36,marginBottom:12}}>✅</div><div style={{fontSize:18,fontWeight:600,color:T.ghost}}>No absences this month</div></div>
            :<div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"140px 110px 110px 1fr 44px",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.card}}>
                {["Name","Date","Reason","Notes",""].map((h,i)=><div key={i} style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600}}>{h}</div>)}
              </div>
              {[...filteredAbsences].sort((a,b)=>b.date.localeCompare(a.date)).map((ab,idx)=>{
                const m=getMember(ab.memberId); const isLast=idx===filteredAbsences.length-1;
                return(
                  <div key={ab.id} style={{display:"grid",gridTemplateColumns:"140px 110px 110px 1fr 44px",padding:"12px 16px",borderBottom:isLast?"none":`1px solid ${T.border}`,alignItems:"center"}}>
                    <div><div style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{m.name||"—"}</div><div style={{fontSize:10,color:rca(m.role),marginTop:2,fontWeight:600}}>{m.role||"—"}</div></div>
                    <div style={{fontSize:12,color:T.muted}}>{ab.date}</div>
                    <div><span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:T.rougeBg,color:T.rougeText,border:`1px solid ${T.rougeText}44`}}>{ab.reason}</span></div>
                    <div style={{fontSize:12,color:T.ghost,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ab.notes||"—"}</div>
                    <div style={{display:"flex",justifyContent:"center"}}>{isAdmin&&<button onClick={()=>deleteAbsence(ab.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:16,padding:"0 4px"}} onMouseEnter={e=>e.currentTarget.style.color=T.rougeText} onMouseLeave={e=>e.currentTarget.style.color=T.ghost}>✕</button>}</div>
                  </div>
                );
              })}
            </div>}
        </>)}

        {view==="team"&&(<>
          {members.length===0
            ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36,marginBottom:12}}>👥</div><div style={{fontSize:18,fontWeight:600,color:T.ghost,marginBottom:6}}>No team members yet</div><div style={{fontSize:13,color:T.ghost,marginBottom:20}}>{isAdmin?"Add your first team member to start tracking attendance":"No team members have been added yet."}</div>{isAdmin&&<button onClick={()=>{setEditMember(null);setMemberForm(true);}} style={{padding:"9px 22px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Add first member</button>}</div>
            :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
              {absenteeStats.map(m=>(
                <div key={m.id} style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:`${rca(m.role)}22`,border:`2px solid ${rca(m.role)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:rca(m.role),flexShrink:0}}>{m.name.charAt(0).toUpperCase()}</div>
                    <div style={{display:"flex",gap:5}}>
                      {isAdmin&&<button onClick={()=>{setEditMember(m.id);setMemberForm(true);}} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:12,padding:"3px 7px"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.lime} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>✎</button>}
                      {isAdmin&&<button onClick={()=>deleteMember(m.id)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:12,padding:"3px 7px"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.rougeText} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>✕</button>}
                    </div>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:T.offWhite,marginBottom:3}}>{m.name}</div>
                  <div style={{display:"inline-block",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${rca(m.role)}18`,color:rca(m.role),border:`1px solid ${rca(m.role)}44`,marginBottom:10}}>{m.role}</div>
                  {m.phone&&<div style={{fontSize:11,color:T.ghost,marginBottom:6}}>📞 {m.phone}</div>}
                  <div style={{display:"flex",gap:8,marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                    <div style={{textAlign:"center",flex:1}}><div style={{fontSize:18,fontWeight:700,color:m.total>0?T.rougeText:T.lime}}>{m.total}</div><div style={{fontSize:9.5,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px"}}>Total</div></div>
                    <div style={{width:1,background:T.border}}/>
                    <div style={{textAlign:"center",flex:1}}><div style={{fontSize:18,fontWeight:700,color:m.thisMonth>0?T.amberText:T.lime}}>{m.thisMonth}</div><div style={{fontSize:9.5,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px"}}>This month</div></div>
                  </div>
                </div>
              ))}
            </div>}
        </>)}

        {view==="history"&&(<>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <label style={{fontSize:11,color:T.ghost,fontFamily:FB}}>Filter month</label>
            <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.offWhite,fontSize:12,fontFamily:FB,outline:"none"}}/>
          </div>
          {members.length===0
            ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36}}>📋</div><div style={{fontSize:18,fontWeight:600,color:T.ghost,marginTop:12}}>No team members added yet</div></div>
            :<div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"160px repeat(7,1fr)",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.card}}>
                <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600}}>Member</div>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600,textAlign:"center"}}>{d}</div>)}
              </div>
              {members.map((m,idx)=>{
                const memberAbs=absences.filter(a=>String(a.memberId)===String(m.id)&&a.date?.startsWith(filterMonth));
                const absDates=new Set(memberAbs.map(a=>a.date));
                const isLast=idx===members.length-1;
                const [yr,mo]=filterMonth.split("-").map(Number);
                const daysInMonth=new Date(yr,mo,0).getDate();
                const days=Array.from({length:daysInMonth},(_,i)=>{const d=new Date(yr,mo-1,i+1);return{date:d.toISOString().slice(0,10),day:i+1};});
                return(
                  <div key={m.id} style={{borderBottom:isLast?"none":`1px solid ${T.border}`,padding:"12px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:`${rca(m.role)}22`,border:`1.5px solid ${rca(m.role)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rca(m.role)}}>{m.name.charAt(0).toUpperCase()}</div>
                      <span style={{fontSize:13,fontWeight:500,color:T.offWhite}}>{m.name}</span>
                      <span style={{fontSize:10,color:rca(m.role),fontWeight:600}}>{m.role}</span>
                      {memberAbs.length>0&&<span style={{marginLeft:"auto",fontSize:11,color:T.rougeText,fontWeight:600}}>{memberAbs.length} absence{memberAbs.length!==1?"s":""}</span>}
                    </div>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {days.map(d=>{
                        const absent=absDates.has(d.date);
                        const isToday=d.date===new Date().toISOString().slice(0,10);
                        const reason=memberAbs.find(a=>a.date===d.date)?.reason;
                        return <div key={d.date} title={absent?`${d.date}: ${reason}`:d.date} style={{width:22,height:22,borderRadius:5,fontSize:9,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",cursor:"default",background:absent?T.rougeBg:isToday?`${T.lime}22`:T.bg,color:absent?T.rougeText:isToday?T.lime:T.ghost,border:`1px solid ${absent?T.rougeText+"60":isToday?T.lime+"60":T.border}`}}>{d.day}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>}
        </>)}
      </div>

      {isAdmin&&memberForm&&<MemberModal editId={editMember} roles={roles} onAddRole={handleAddRole} onRemoveRole={handleRemoveRole} onSave={handleAddMember} onClose={()=>{setMemberForm(false);setEditMember(null);}}/>}
      {absenceForm&&<AbsenceModal members={members} onSave={handleAddAbsence} onClose={()=>setAbsenceForm(false)}/>}
    </div>
  );
}

const CONV_PLATFORMS_ALL = ["All","Fleek","Instagram (B2C)","Instagram (B2B)","Vinted","Depop","Offline"];
const CONV_PLATFORMS_SELL = ["Fleek","Instagram (B2C)","Instagram (B2B)","Vinted","Depop","Offline"];

function RateEntryModal({ onSave, onClose, initial }) {
  const today = new Date().toISOString().slice(0,10);
  const [dateFrom, setDateFrom] = useState(initial?.dateFrom || today);
  const [dateTo, setDateTo] = useState(initial?.dateTo || today);
  const [platform, setPlatform] = useState(initial?.platform || "Fleek");
  const [gbp, setGbp] = useState(initial?.rates?.GBP || "");
  const [usd, setUsd] = useState(initial?.rates?.USD || "");
  const [eur, setEur] = useState(initial?.rates?.EUR || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const canSave = (gbp||usd||eur) && dateFrom && dateTo && platform;

  const IS = {width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:13,fontFamily:FB,color:T.offWhite,outline:"none",boxSizing:"border-box"};

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:500,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",padding:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <div style={{fontFamily:FB,fontSize:20,fontWeight:700,color:T.lime}}>{initial?"Edit rate entry":"Log past exchange rate"}</div>
          <button onClick={onClose} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {/* Date range */}
        <div style={{background:T.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:16}}>
          <div style={{fontSize:11,color:T.lime,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.8px"}}>📅 Date range this rate applied</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 36px 1fr",gap:8,alignItems:"center"}}>
            <FR label="From"><input style={IS} type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);if(e.target.value>dateTo)setDateTo(e.target.value);}}/></FR>
            <div style={{fontSize:18,color:T.ghost,textAlign:"center",paddingTop:16}}>→</div>
            <FR label="To"><input style={IS} type="date" value={dateTo} min={dateFrom} onChange={e=>setDateTo(e.target.value)}/></FR>
          </div>
          {dateFrom!==dateTo&&<div style={{fontSize:11,color:T.cobaltText,marginTop:4,background:T.cobaltBg,padding:"4px 10px",borderRadius:8,display:"inline-block"}}>
            Range: {Math.round((new Date(dateTo)-new Date(dateFrom))/(1000*60*60*24)+1)} days
          </div>}
        </div>

        {/* Platform */}
        <FR label="Selling platform">
          <select style={IS} value={platform} onChange={e=>setPlatform(e.target.value)}>
            {CONV_PLATFORMS_SELL.map(p=><option key={p}>{p}</option>)}
          </select>
        </FR>

        {/* Rates */}
        <div style={{background:T.card,borderRadius:10,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:14}}>
          <div style={{fontSize:11,color:T.lime,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.8px"}}>💱 Exchange rates → PKR</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{c:"GBP",s:"£",v:gbp,set:setGbp},{c:"USD",s:"$",v:usd,set:setUsd},{c:"EUR",s:"€",v:eur,set:setEur}].map(({c,s,v,set})=>(
              <div key={c}>
                <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px"}}>{s} {c}</label>
                <div style={{display:"flex",alignItems:"center",gap:6,background:T.surface,borderRadius:8,padding:"8px 10px",border:`1px solid ${v?T.lime:T.border}`}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.lime,flexShrink:0}}>{s}1 =</span>
                  <span style={{fontSize:11,color:T.ghost,flexShrink:0}}>₨</span>
                  <input type="number" min="1" value={v} onChange={e=>set(e.target.value)} placeholder="—"
                    style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:15,fontWeight:700,color:T.offWhite,fontFamily:FB,width:0,minWidth:0}}/>
                </div>
                {v>0&&<div style={{fontSize:10,color:T.ghost,marginTop:4}}>£100 = ₨{(100*parseFloat(v)).toLocaleString()}</div>}
              </div>
            ))}
          </div>
        </div>

        <FR label="Notes (optional)">
          <input style={IS} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Post-budget rate spike, Eid season…"/>
        </FR>

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
          <button onClick={onClose} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
          <button onClick={()=>{if(!canSave)return;onSave({dateFrom,dateTo,platform,rates:{GBP:gbp?parseFloat(gbp):null,USD:usd?parseFloat(usd):null,EUR:eur?parseFloat(eur):null},notes});}} disabled={!canSave}
            style={{padding:"8px 22px",border:"none",borderRadius:8,background:canSave?T.lime:T.border,color:canSave?T.ink:T.ghost,cursor:canSave?"pointer":"not-allowed",fontSize:13,fontWeight:700,fontFamily:FB}}>
            {initial?"Save changes":"Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConversionPage({ rates, setRates, rateHistory, setRateHistory }) {
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState({...rates});
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [view, setView] = useState("current");
  const [addingPast, setAddingPast] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortDir, setSortDir] = useState(-1); // -1 = newest first

  const pairs = [{from:"GBP",symbol:"£",label:"British Pound"},{from:"USD",symbol:"$",label:"US Dollar"},{from:"EUR",symbol:"€",label:"Euro"}];
  const history = rateHistory || [];

  const saveCurrentRates = () => {
    const entry = {
      id: Date.now(),
      dateFrom: new Date().toISOString().slice(0,10),
      dateTo: new Date().toISOString().slice(0,10),
      platform: "All",
      rates: { GBP: parseFloat(local.GBP)||null, USD: parseFloat(local.USD)||null, EUR: parseFloat(local.EUR)||null },
      notes: "Current rates snapshot",
    };
    setRates(local);
    setRateHistory([entry, ...history]);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const savePastEntry = entry => {
    setRateHistory([{ id:Date.now(), ...entry }, ...history]);
    setAddingPast(false);
  };

  const saveEditedEntry = entry => {
    setRateHistory(history.map(h => h.id===editingEntry.id ? { ...h, ...entry } : h));
    setEditingEntry(null);
  };

  const deleteEntry = id => setRateHistory(history.filter(h=>h.id!==id));

  const filteredHistory = history
    .filter(h => filterPlatform==="All" || h.platform===filterPlatform || h.platform==="All")
    .filter(h => !filterDateFrom || h.dateTo >= filterDateFrom)
    .filter(h => !filterDateTo || h.dateFrom <= filterDateTo)
    .sort((a,b) => sortDir * b.dateFrom.localeCompare(a.dateFrom));

  const IS2 = {padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:12,fontFamily:FB,color:T.offWhite,outline:"none"};

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>Currency Conversion</div>
        <div style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          {[{k:"current",l:"Live Rates"},{k:"history",l:`History (${history.length})`}].map((t,i)=>(
            <button key={t.k} onClick={()=>setView(t.k)} style={{padding:"6px 14px",background:view===t.k?T.lime:"transparent",border:"none",borderLeft:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",fontSize:12.5,color:view===t.k?T.ink:T.muted,fontFamily:FB,fontWeight:view===t.k?700:400}}>{t.l}</button>
          ))}
        </div>
        {saved&&<span style={{fontSize:12,color:T.lime}}>✓ Saved</span>}
        {view==="history"&&<button onClick={()=>setAddingPast(true)} style={{padding:"7px 16px",border:`1px solid ${T.lime}`,borderRadius:9,background:"transparent",color:T.lime,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Log past rate</button>}
        {view==="current"&&<button onClick={saveCurrentRates} style={{padding:"7px 18px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>Save rates</button>}
      </div>

      <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"20px 24px"}}>

        {/* ── LIVE RATES ── */}
        {view==="current"&&(
          <div style={{maxWidth:540}}>
            <p style={{fontSize:13,color:T.ghost,marginBottom:20,lineHeight:1.6}}>
              Set your current exchange rates. Hit <strong style={{color:T.lime}}>Save rates</strong> to apply them and log a snapshot to history.
            </p>
            {pairs.map(({from,symbol,label})=>(
              <div key={from} style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"18px 20px",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{fontSize:15,fontWeight:700,color:T.offWhite}}>{symbol} {from} <span style={{fontSize:11,color:T.ghost,fontWeight:400}}>— {label}</span></div>
                  <div style={{fontSize:11,color:T.ghost}}>→ PKR</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,borderRadius:8,padding:"8px 12px",border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:16,fontWeight:700,color:T.lime}}>{symbol}1</span>
                  <span style={{fontSize:18,color:T.ghost}}>=</span>
                  <span style={{fontSize:13,color:T.ghost}}>₨</span>
                  <input type="number" min="1" value={local[from]||""} onChange={e=>setLocal(p=>({...p,[from]:e.target.value}))} placeholder="e.g. 350"
                    style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:18,fontWeight:700,color:T.offWhite,fontFamily:FB,width:80}}/>
                </div>
                {local[from]>0&&<div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[1,10,50,100].map(a=><div key={a} style={{background:T.surface,borderRadius:8,padding:"5px 10px",fontSize:11,color:T.muted}}>
                    {symbol}{a} = <span style={{color:T.lime,fontWeight:600}}>₨{(a*parseFloat(local[from])).toLocaleString()}</span>
                  </div>)}
                </div>}
              </div>
            ))}
            <div style={{background:`${T.lime}10`,border:`1px solid ${T.lime}30`,borderRadius:10,padding:"14px 16px",marginTop:4}}>
              <div style={{fontSize:11,color:T.lime,fontWeight:600,marginBottom:6}}>💡 Tip</div>
              <div style={{fontSize:12,color:T.ghost,lineHeight:1.7}}>To log rates for a specific platform or past date range, switch to the <strong style={{color:T.offWhite}}>History</strong> tab and click <strong style={{color:T.offWhite}}>+ Log past rate</strong>.</div>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {view==="history"&&(<>
          {/* Filters */}
          <div style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,padding:"14px 18px",marginBottom:18,display:"flex",flexWrap:"wrap",gap:14,alignItems:"flex-end"}}>
            <div>
              <div style={{fontSize:10,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>Platform</div>
              <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)} style={{...IS2,minWidth:140}}>
                {CONV_PLATFORMS_ALL.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>Date from</div>
              <input type="date" value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} style={IS2}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>Date to</div>
              <input type="date" value={filterDateTo} onChange={e=>setFilterDateTo(e.target.value)} style={IS2}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>Sort</div>
              <select value={sortDir} onChange={e=>setSortDir(Number(e.target.value))} style={IS2}>
                <option value={-1}>Newest first</option>
                <option value={1}>Oldest first</option>
              </select>
            </div>
            {(filterPlatform!=="All"||filterDateFrom||filterDateTo)&&
              <button onClick={()=>{setFilterPlatform("All");setFilterDateFrom("");setFilterDateTo("");}}
                style={{padding:"6px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",color:T.ghost,cursor:"pointer",fontSize:12,fontFamily:FB}}>
                Clear filters
              </button>}
            <span style={{fontSize:11.5,color:T.ghost,marginLeft:"auto"}}>{filteredHistory.length} entr{filteredHistory.length!==1?"ies":"y"}</span>
          </div>

          {filteredHistory.length===0
            ?<div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:36,marginBottom:12}}>📈</div>
              <div style={{fontSize:18,fontWeight:600,color:T.ghost}}>No rate history yet</div>
              <div style={{fontSize:13,color:T.ghost,marginTop:6,marginBottom:20}}>Log past rates to build a historical record</div>
              <button onClick={()=>setAddingPast(true)} style={{padding:"9px 22px",border:`1px solid ${T.lime}`,borderRadius:9,background:"transparent",color:T.lime,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ Log past rate</button>
            </div>
            :<div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
              {/* Table header */}
              <div style={{display:"grid",gridTemplateColumns:"120px 120px 130px 1fr 1fr 1fr 160px 80px",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:T.card}}>
                {["From","To","Platform","£ GBP","$ USD","€ EUR","Notes",""].map((h,i)=>(
                  <div key={i} style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.9px",color:T.ghost,fontWeight:600}}>{h}</div>
                ))}
              </div>
              {filteredHistory.map((h,idx)=>{
                const isLast=idx===filteredHistory.length-1;
                const isToday=h.dateTo===new Date().toISOString().slice(0,10)&&h.dateFrom===h.dateTo;
                return(
                  <div key={h.id}
                    style={{display:"grid",gridTemplateColumns:"120px 120px 130px 1fr 1fr 1fr 160px 80px",padding:"12px 16px",borderBottom:isLast?"none":`1px solid ${T.border}`,alignItems:"center",background:isToday?`${T.lime}06`:"transparent"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.card}
                    onMouseLeave={e=>e.currentTarget.style.background=isToday?`${T.lime}06`:"transparent"}>
                    <div style={{fontSize:12,color:T.muted}}>{h.dateFrom}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:12,color:T.muted}}>{h.dateTo}</span>
                      {isToday&&<span style={{fontSize:9,color:T.lime,fontWeight:700,background:`${T.lime}22`,padding:"1px 5px",borderRadius:10}}>TODAY</span>}
                      {h.dateFrom!==h.dateTo&&<span style={{fontSize:9,color:T.cobaltText,background:T.cobaltBg,padding:"1px 5px",borderRadius:10}}>
                        {Math.round((new Date(h.dateTo)-new Date(h.dateFrom))/(1000*60*60*24)+1)}d
                      </span>}
                    </div>
                    <div>
                      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:T.cobaltBg,color:T.cobaltText,border:`1px solid ${T.cobaltText}44`}}>{h.platform}</span>
                    </div>
                    {["GBP","USD","EUR"].map(c=>(
                      <div key={c} style={{fontSize:13,fontWeight:600,color:h.rates[c]?T.lime:T.ghost}}>
                        {h.rates[c]?`₨${parseFloat(h.rates[c]).toLocaleString()}`:"—"}
                      </div>
                    ))}
                    <div style={{fontSize:11,color:T.ghost,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{h.notes||"—"}</div>
                    <div style={{display:"flex",justifyContent:"center",gap:5}}>
                      <button onClick={()=>setEditingEntry(h)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:12,padding:"3px 7px"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.lime;e.currentTarget.style.color=T.lime;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.ghost;}}>✎</button>
                      <button onClick={()=>deleteEntry(h.id)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:12,padding:"3px 7px"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.rougeText;e.currentTarget.style.color=T.rougeText;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.ghost;}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>}
        </>)}
      </div>

      {addingPast&&<RateEntryModal onSave={savePastEntry} onClose={()=>setAddingPast(false)}/>}
      {editingEntry&&<RateEntryModal initial={editingEntry} onSave={saveEditedEntry} onClose={()=>setEditingEntry(null)}/>}
    </div>
  );
}

// ── Profit Bot Page ───────────────────────────────────────────────────────────
// Shared helpers (module-level so they're never recreated)
const PB_INP_GREEN = {padding:"10px 14px",border:`2px solid #C8F135`,borderRadius:9,background:"#C8F13510",fontSize:15,fontFamily:"'Google Sans','Product Sans',system-ui,sans-serif",color:"#F0EBF8",outline:"none",width:"100%",boxSizing:"border-box",fontWeight:600};
const PB_INP_GREY  = {padding:"10px 14px",border:"1px solid #3D2F5A",borderRadius:9,background:"#2E2244",fontSize:15,fontFamily:"'Google Sans','Product Sans',system-ui,sans-serif",color:"#F0EBF8",outline:"none",width:"100%",boxSizing:"border-box"};
const PB_SEL       = {padding:"5px 10px",border:"1px solid #3D2F5A",borderRadius:8,background:"#2E2244",fontSize:12,fontFamily:"'Google Sans','Product Sans',system-ui,sans-serif",color:"#C8F135",outline:"none",fontWeight:700,cursor:"pointer"};

const PBLabel = ({children}) => <div style={{fontSize:10,color:"#6B5F8B",textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,marginBottom:6}}>{children}</div>;
const PBOutBox = ({label,value,accent}) => (
  <div style={{background:"#261C3A",borderRadius:10,padding:"12px 14px",border:"1px solid #3D2F5A"}}>
    <PBLabel>{label}</PBLabel>
    <div style={{fontSize:18,fontWeight:700,color:accent||"#C8F135"}}>{value||"—"}</div>
  </div>
);
const PBCard = ({title,emoji,children}) => (
  <div style={{background:"#2E2244",borderRadius:14,border:"1px solid #3D2F5A",padding:"22px 22px",marginBottom:18}}>
    <div style={{fontSize:16,fontWeight:700,color:"#C8F135",marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:20}}>{emoji}</span>{title}
    </div>
    {children}
  </div>
);

const CURRENCIES = [{code:"GBP",sym:"£"},{code:"USD",sym:"$"},{code:"EUR",sym:"€"},{code:"PKR",sym:"₨"}];
const pbFmt    = (n,d=2) => n!=null&&!isNaN(n)?n.toFixed(d):null;
const pbFmtPKR = n => n!=null&&!isNaN(n)?`₨${Math.round(n).toLocaleString()}`:null;
const pbFmtCur = (n,sym,d=2) => n!=null&&!isNaN(n)?`${sym}${parseFloat(n).toFixed(d)}`:null;
const pbFmtPct = n => n!=null&&!isNaN(n)?`${parseFloat(n).toFixed(2)}%`:null;

function PBSoldCalc({ gbpRate, usdRate, eurRate }) {
  const [boughtPKR, setBoughtPKR] = useState("");
  const [profitPct, setProfitPct] = useState("");
  const [commPct,   setCommPct]   = useState("");
  const [inCur,     setInCur]     = useState("PKR"); // currency of boughtPrice input

  const getRateToGBP = cur => cur==="GBP"?1:cur==="USD"?gbpRate/usdRate:cur==="EUR"?gbpRate/eurRate:1/gbpRate;
  const toGBP = (val,cur) => parseFloat(val)*getRateToGBP(cur);

  const calc = () => {
    const boughtV = parseFloat(boughtPKR)||0;
    const profit  = parseFloat(profitPct)||0;
    const comm    = parseFloat(commPct)||0;
    if (!boughtV) return null;
    const denom = 1-(profit/100)-(comm/100);
    if (denom<=0) return null;
    const boughtPKRv = inCur==="PKR"?boughtV:inCur==="GBP"?boughtV*gbpRate:inCur==="USD"?boughtV*usdRate:boughtV*eurRate;
    const soldPKR = boughtPKRv/denom;
    return { soldPKR, soldGBP:soldPKR/gbpRate, soldEUR:soldPKR/eurRate, soldUSD:soldPKR/usdRate };
  };
  const r = calc();

  const inSym = CURRENCIES.find(c=>c.code===inCur)?.sym||"₨";

  return (
    <PBCard title="Price (Sold) Calculator" emoji="🏷️">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <PBLabel>Bought Price ✏️</PBLabel>
            <select style={PB_SEL} value={inCur} onChange={e=>setInCur(e.target.value)}>
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.sym} {c.code}</option>)}
            </select>
          </div>
          <input type="number" value={boughtPKR} onChange={e=>setBoughtPKR(e.target.value)} placeholder={`e.g. ${inCur==="PKR"?"1900":"5.50"}`} style={PB_INP_GREEN}/>
        </div>
        <div><PBLabel>Target Profit % ✏️</PBLabel><input type="number" value={profitPct} onChange={e=>setProfitPct(e.target.value)} placeholder="e.g. 65" style={PB_INP_GREEN}/></div>
        <div><PBLabel>Commission % ✏️</PBLabel><input type="number" value={commPct} onChange={e=>setCommPct(e.target.value)} placeholder="e.g. 18" style={PB_INP_GREEN}/></div>
      </div>
      {r?(<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <PBOutBox label="Sold Price (₨)" value={pbFmtPKR(r.soldPKR)} accent="#C8F135"/>
        <PBOutBox label="Sold Price (£)" value={pbFmtCur(r.soldGBP,"£")}/>
        <PBOutBox label="Sold Price (€)" value={pbFmtCur(r.soldEUR,"€")}/>
        <PBOutBox label="Sold Price ($)" value={pbFmtCur(r.soldUSD,"$")}/>
      </div>):<div style={{fontSize:12,color:"#6B5F8B",textAlign:"center",padding:"14px 0"}}>Fill in the green fields above to calculate</div>}
    </PBCard>
  );
}

function PBProfitCalc({ gbpRate, usdRate, eurRate }) {
  const [soldVal,   setSoldVal]   = useState("");
  const [soldCur,   setSoldCur]   = useState("GBP");
  const [commPct,   setCommPct]   = useState("");
  const [boughtPKR, setBoughtPKR] = useState("");
  const [shipPKR,   setShipPKR]   = useState("");
  const [shipMode,  setShipMode]  = useState("excluding");

  const toRatePKR = cur => cur==="PKR"?1:cur==="GBP"?gbpRate:cur==="USD"?usdRate:eurRate;
  const sym = CURRENCIES.find(c=>c.code===soldCur)?.sym||"£";

  const calc = () => {
    const soldV     = parseFloat(soldVal)||0;
    const comm      = parseFloat(commPct)||0;
    const boughtV   = parseFloat(boughtPKR)||0;
    const ship      = parseFloat(shipPKR)||0;
    if (!soldV) return null;
    const soldPKR   = soldV * toRatePKR(soldCur);
    const commAmt   = soldPKR*(comm/100);
    const boughtGBP = boughtV/gbpRate;
    const shipDeduct= shipMode==="including"?ship:0;
    const profitPKR = soldPKR-boughtV-commAmt-shipDeduct;
    const profitGBP = profitPKR/gbpRate;
    const profitPct = soldPKR>0?(profitPKR/soldPKR)*100:0;
    const profitExcl= soldPKR-boughtV-commAmt;
    const profitIncl= soldPKR-boughtV-commAmt-ship;
    return { soldPKR,boughtGBP,profitPKR,profitGBP,profitPct,profitExcl,profitIncl,ship };
  };
  const r = calc();

  return (
    <PBCard title="Profit Calculator" emoji="📊">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <PBLabel>Sold Price ✏️</PBLabel>
            <select style={PB_SEL} value={soldCur} onChange={e=>setSoldCur(e.target.value)}>
              {CURRENCIES.filter(c=>c.code!=="PKR").map(c=><option key={c.code} value={c.code}>{c.sym} {c.code}</option>)}
            </select>
          </div>
          <input type="number" value={soldVal} onChange={e=>setSoldVal(e.target.value)} placeholder={`e.g. ${soldCur==="GBP"?"8.22":soldCur==="USD"?"10.50":"9.80"}`} style={PB_INP_GREEN}/>
        </div>
        <div><PBLabel>Commission % ✏️</PBLabel><input type="number" value={commPct} onChange={e=>setCommPct(e.target.value)} placeholder="e.g. 0" style={PB_INP_GREEN}/></div>
        <div><PBLabel>Bought Price (₨) ✏️</PBLabel><input type="number" value={boughtPKR} onChange={e=>setBoughtPKR(e.target.value)} placeholder="e.g. 1850" style={PB_INP_GREEN}/></div>
        <div><PBLabel>Est. Shipping (₨) ✏️</PBLabel><input type="number" value={shipPKR} onChange={e=>setShipPKR(e.target.value)} placeholder="e.g. 250" style={PB_INP_GREEN}/></div>
      </div>
      {shipPKR&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:"#261C3A",borderRadius:9,border:"1px solid #3D2F5A"}}>
        <span style={{fontSize:12,color:"#6B5F8B"}}>Shipping is:</span>
        {["excluding","including"].map(m=>(
          <button key={m} onClick={()=>setShipMode(m)} style={{padding:"4px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:shipMode===m?700:400,border:`1px solid ${shipMode===m?"#C8F135":"#3D2F5A"}`,background:shipMode===m?"#C8F13522":"transparent",color:shipMode===m?"#C8F135":"#9B8FBB"}}>
            {m==="excluding"?"Excluding (customer pays)":"Including (out of sale)"}
          </button>
        ))}
      </div>}
      {r?(<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:r.ship?12:0}}>
          <PBOutBox label="Bought Price (£)" value={pbFmtCur(r.boughtGBP,"£")}/>
          <PBOutBox label={`Sold (₨)`} value={pbFmtPKR(r.soldPKR)}/>
          <PBOutBox label="Profit (£)" value={pbFmtCur(r.profitGBP,"£")} accent={r.profitGBP>=0?"#A8E060":"#F07070"}/>
          <PBOutBox label="Profit (₨)" value={pbFmtPKR(r.profitPKR)} accent={r.profitPKR>=0?"#A8E060":"#F07070"}/>
          <PBOutBox label="Profit %" value={pbFmtPct(r.profitPct)} accent={r.profitPct>=0?"#A8E060":"#F07070"}/>
        </div>
        {r.ship>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:2}}>
          <div style={{background:"#261C3A",borderRadius:10,padding:"12px 14px",border:"1px solid #7ECB7E44"}}>
            <div style={{fontSize:10,color:"#7ECB7E",textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,marginBottom:6}}>✅ Excl. shipping (customer pays)</div>
            <div style={{fontSize:16,fontWeight:700,color:r.profitExcl>=0?"#A8E060":"#F07070"}}>₨{Math.round(r.profitExcl).toLocaleString()}</div>
            <div style={{fontSize:11,color:"#6B5F8B",marginTop:2}}>{pbFmtCur(r.profitExcl/gbpRate,"£")} · {pbFmtPct(r.soldPKR>0?(r.profitExcl/r.soldPKR)*100:0)} margin</div>
          </div>
          <div style={{background:"#261C3A",borderRadius:10,padding:"12px 14px",border:"1px solid #F0707044"}}>
            <div style={{fontSize:10,color:"#F07070",textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,marginBottom:6}}>📦 Incl. shipping (out of sale)</div>
            <div style={{fontSize:16,fontWeight:700,color:r.profitIncl>=0?"#A8E060":"#F07070"}}>₨{Math.round(r.profitIncl).toLocaleString()}</div>
            <div style={{fontSize:11,color:"#6B5F8B",marginTop:2}}>{pbFmtCur(r.profitIncl/gbpRate,"£")} · {pbFmtPct(r.soldPKR>0?(r.profitIncl/r.soldPKR)*100:0)} margin</div>
          </div>
        </div>}
      </>):<div style={{fontSize:12,color:"#6B5F8B",textAlign:"center",padding:"14px 0"}}>Fill in the green fields above to calculate</div>}
    </PBCard>
  );
}

function PBBoughtCalc({ gbpRate, usdRate, eurRate }) {
  const [sellingVal, setSellingVal] = useState("");
  const [selCur,     setSelCur]     = useState("GBP");
  const [profitPct,  setProfitPct]  = useState("");
  const [commPct,    setCommPct]    = useState("");

  const toRatePKR = cur => cur==="PKR"?1:cur==="GBP"?gbpRate:cur==="USD"?usdRate:eurRate;

  const calc = () => {
    const selV   = parseFloat(sellingVal)||0;
    const profit = parseFloat(profitPct)||0;
    const comm   = parseFloat(commPct)||0;
    if (!selV) return null;
    const selPKR    = selV*toRatePKR(selCur);
    const boughtPKR = selPKR*(1-(profit/100)-(comm/100));
    return { boughtPKR, boughtGBP:boughtPKR/gbpRate, boughtUSD:boughtPKR/usdRate, boughtEUR:boughtPKR/eurRate };
  };
  const r = calc();

  return (
    <PBCard title="Price (Bought) Calculator" emoji="🛒">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <PBLabel>Selling Price (Avg) ✏️</PBLabel>
            <select style={PB_SEL} value={selCur} onChange={e=>setSelCur(e.target.value)}>
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.sym} {c.code}</option>)}
            </select>
          </div>
          <input type="number" value={sellingVal} onChange={e=>setSellingVal(e.target.value)} placeholder={`e.g. ${selCur==="PKR"?"1500":"4.20"}`} style={PB_INP_GREEN}/>
        </div>
        <div><PBLabel>Target Profit % ✏️</PBLabel><input type="number" value={profitPct} onChange={e=>setProfitPct(e.target.value)} placeholder="e.g. 30" style={PB_INP_GREEN}/></div>
        <div><PBLabel>Commission % ✏️</PBLabel><input type="number" value={commPct} onChange={e=>setCommPct(e.target.value)} placeholder="e.g. 15" style={PB_INP_GREEN}/></div>
      </div>
      {r?(<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <PBOutBox label="Max Buy (₨)" value={pbFmtPKR(r.boughtPKR)} accent="#7EB8F0"/>
        <PBOutBox label="Max Buy (£)" value={pbFmtCur(r.boughtGBP,"£")} accent="#7EB8F0"/>
        <PBOutBox label="Max Buy ($)" value={pbFmtCur(r.boughtUSD,"$")} accent="#7EB8F0"/>
        <PBOutBox label="Max Buy (€)" value={pbFmtCur(r.boughtEUR,"€")} accent="#7EB8F0"/>
      </div>):<div style={{fontSize:12,color:"#6B5F8B",textAlign:"center",padding:"14px 0"}}>Fill in the green fields above to calculate</div>}
    </PBCard>
  );
}

// ── AI Assistant Panel ────────────────────────────────────────────────────────
function AIAssistant({ context, systemPrompt, placeholder }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role:"user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const contextBlock = context ? `\n\nCurrent page context:\n${context}` : "";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: systemPrompt + contextBlock,
          messages: newMessages,
        }),
      });
      const data = await response.json();
      const reply = data.content?.map(b => b.text||"").join("") || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role:"assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role:"assistant", content:"Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const clear = () => setMessages([]);

  // Floating button when closed
  if (!open) return (
    <button onClick={()=>setOpen(true)} title="AI Assistant"
      style={{position:"fixed",bottom:24,right:24,width:52,height:52,borderRadius:"50%",background:T.lime,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",zIndex:200,transition:"transform 0.15s"}}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      🤖
    </button>
  );

  return (
    <div style={{position:"fixed",bottom:24,right:24,width:380,maxWidth:"calc(100vw - 48px)",height:520,background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",zIndex:200,boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.card,borderRadius:"16px 16px 0 0",flexShrink:0}}>
        <span style={{fontSize:20}}>🤖</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:T.lime,fontFamily:FB}}>AI Assistant</div>
          <div style={{fontSize:10,color:T.ghost,fontFamily:FB}}>Context-aware · Powered by Claude</div>
        </div>
        {messages.length>0&&<button onClick={clear} title="Clear chat" style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:11,padding:"2px 8px",fontFamily:FB}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.rougeText} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>Clear</button>}
        <button onClick={()=>setOpen(false)} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:16,color:T.muted,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0&&(
          <div style={{textAlign:"center",padding:"30px 10px"}}>
            <div style={{fontSize:32,marginBottom:10}}>🤖</div>
            <div style={{fontSize:13,color:T.offWhite,fontWeight:600,fontFamily:FB,marginBottom:6}}>How can I help?</div>
            <div style={{fontSize:11,color:T.ghost,fontFamily:FB,lineHeight:1.6}}>{placeholder}</div>
          </div>
        )}
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{
              maxWidth:"85%",padding:"10px 13px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",
              background:m.role==="user"?T.lime:T.card,
              color:m.role==="user"?T.ink:T.offWhite,
              fontSize:12.5,fontFamily:FB,lineHeight:1.6,
              border:m.role==="assistant"?`1px solid ${T.border}`:"none",
              whiteSpace:"pre-wrap",wordBreak:"break-word",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",justifyContent:"flex-start"}}>
            <div style={{padding:"10px 14px",borderRadius:"12px 12px 12px 3px",background:T.card,border:`1px solid ${T.border}`,display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.lime,animation:"pbdot 1s ease-in-out infinite",animationDelay:`${i*0.15}s`,opacity:0.4}}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,flexShrink:0}}>
        <input
          ref={inputRef}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder="Ask anything…"
          disabled={loading}
          style={{flex:1,padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:9,background:T.bg,fontSize:12.5,fontFamily:FB,color:T.offWhite,outline:"none",resize:"none"}}
        />
        <button onClick={send} disabled={!input.trim()||loading}
          style={{padding:"9px 14px",border:"none",borderRadius:9,background:!input.trim()||loading?T.border:T.lime,color:!input.trim()||loading?T.ghost:T.ink,cursor:!input.trim()||loading?"not-allowed":"pointer",fontSize:13,fontWeight:700,fontFamily:FB,flexShrink:0}}>
          Send
        </button>
      </div>

      <style>{`@keyframes pbdot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function ProfitBotPage({ rates }) {
  const [gbpRate, setGbpRate] = useState(parseFloat(rates?.GBP)||372);
  const [usdRate, setUsdRate] = useState(parseFloat(rates?.USD)||278);
  const [eurRate, setEurRate] = useState(parseFloat(rates?.EUR)||300);

  const RATE_INP = {background:"transparent",border:"none",outline:"none",fontSize:16,fontWeight:700,color:"#F0EBF8",fontFamily:"'Google Sans',system-ui,sans-serif",width:80,textAlign:"right"};

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:"#261C3A",borderBottom:"1px solid #3D2F5A",padding:"12px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{fontFamily:"'Google Sans',system-ui,sans-serif",fontSize:20,fontWeight:700,color:"#F0EBF8",flex:1}}>🤖 Profit Bot</div>
        <span style={{fontSize:12,color:"#6B5F8B"}}>Green cells are editable · Currency selectors on each input</span>
      </div>
      <div style={{flex:1,overflowY:"auto",background:"#1E1530",padding:"20px 24px"}}>
        <div style={{maxWidth:960}}>
          {/* Exchange Rates */}
          <div style={{background:"#2E2244",borderRadius:14,border:"1px solid #3D2F5A",padding:"16px 22px",marginBottom:20,display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
            <div style={{fontSize:11,color:"#6B5F8B",textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600,marginRight:4}}>Exchange Rates → PKR</div>
            {[{label:"£ GBP",val:gbpRate,set:setGbpRate,sym:"£"},{label:"$ USD",val:usdRate,set:setUsdRate,sym:"$"},{label:"€ EUR",val:eurRate,set:setEurRate,sym:"€"}].map(({label,val,set,sym})=>(
              <div key={label} style={{display:"flex",alignItems:"center",gap:8,background:"#261C3A",borderRadius:9,padding:"8px 14px",border:"1px solid #3D2F5A",flex:1,minWidth:180}}>
                <span style={{fontSize:14,fontWeight:700,color:"#C8F135",flexShrink:0}}>{sym}1 =</span>
                <span style={{fontSize:13,color:"#6B5F8B"}}>₨</span>
                <input type="number" value={val} onChange={e=>setGbpRate===set?setGbpRate(parseFloat(e.target.value)||0):set(parseFloat(e.target.value)||0)} style={RATE_INP}/>
              </div>
            ))}
          </div>
          <PBSoldCalc gbpRate={gbpRate} usdRate={usdRate} eurRate={eurRate}/>
          <PBProfitCalc gbpRate={gbpRate} usdRate={usdRate} eurRate={eurRate}/>
          <PBBoughtCalc gbpRate={gbpRate} usdRate={usdRate} eurRate={eurRate}/>
          <div style={{background:"#C8F13510",border:"1px solid #C8F13530",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:11,color:"#C8F135",fontWeight:600,marginBottom:6}}>💡 How the formulas work</div>
            <div style={{fontSize:12,color:"#6B5F8B",lineHeight:1.8}}>
              <strong style={{color:"#F0EBF8"}}>Sold Price</strong> = Bought ÷ (1 − Profit% − Commission%) &nbsp;·&nbsp;
              <strong style={{color:"#F0EBF8"}}>Profit</strong> = Sold − Cost − Commission &nbsp;·&nbsp;
              <strong style={{color:"#F0EBF8"}}>Max Buy</strong> = Selling × (1 − Profit% − Commission%)
            </div>
          </div>
        </div>
      </div>
      <AIAssistant
        context={`Exchange rates: GBP=₨${gbpRate}, USD=₨${usdRate}, EUR=₨${eurRate}`}
        systemPrompt={`You are an expert pricing and profit assistant for a secondhand/vintage fashion resale business based in Pakistan that sells internationally (primarily on Vinted, Depop, Fleek, Instagram).

You help with:
- Pricing strategy (what to sell for, what profit margin to target)
- Profit calculations (GBP/USD/EUR ↔ PKR conversions)
- Commission and shipping cost advice
- Break-even analysis
- Buying decisions (max price to pay for an item given target margin)

Formula reference:
- Sold Price = Bought ÷ (1 − Profit% − Commission%)
- Profit = Sold − Cost − Commission − Shipping
- Max Buy = Selling × (1 − Profit% − Commission%)

Always be concise, give concrete numbers when asked, and factor in the current exchange rates provided in context. Respond in plain text, no markdown.`}
        placeholder={"Ask me anything about pricing, profit margins, or buying decisions.\n\nExamples:\n• 'I bought something for ₨2000, what should I sell it for at 50% margin with 15% commission?'\n• 'Is £6 a good price for something I paid ₨1500 for?'\n• 'What's the max I should pay for something I plan to sell at £8?'"}
      />
    </div>
  );
}

// ── Order Working Page ────────────────────────────────────────────────────────
const ORDER_STATUSES = ["Pending","Confirmed","Shipped","Delivered","Cancelled","Returned"];
const ORDER_STATUS_COL = {
  Pending:   {bg:"#2E2010",color:"#F0C060"},
  Confirmed: {bg:"#1A2040",color:"#7EB8F0"},
  Shipped:   {bg:"#1A2E1A",color:"#7ECB7E"},
  Delivered: {bg:"#1A2E1A",color:"#C8F135"},
  Cancelled: {bg:"#2E1010",color:"#F07070"},
  Returned:  {bg:"#2E1010",color:"#F07070"},
};

function OrderFormModal({ initial, onSave, onClose }) {
  const blank = { customerName:"", itemName:"", qty:1, priceBought:"", soldAt:"", commission:"", expectedShipping:"", platform:"Fleek", status:"Pending", notes:"", media:[] };
  const [f, setF] = useState(initial ? {...initial} : blank);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const handleMedia = e => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setF(p=>({...p, media:[...(p.media||[]), {name:file.name, url:ev.target.result}]}));
      reader.readAsDataURL(file);
    });
  };
  const removeMedia = i => setF(p=>({...p, media:p.media.filter((_,idx)=>idx!==i)}));

  const profit = () => {
    const sold = parseFloat(f.soldAt)||0;
    const cost = parseFloat(f.priceBought)||0;
    const comm = parseFloat(f.commission)||0;
    const ship = parseFloat(f.expectedShipping)||0;
    return sold - cost - comm - ship;
  };

  const IS = {width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,background:T.card,fontSize:13,fontFamily:FB,color:T.offWhite,outline:"none",boxSizing:"border-box"};
  const G2 = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};

  const p = profit();

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,5,20,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,width:560,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",padding:26}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <div style={{fontFamily:FB,fontSize:20,fontWeight:700,color:T.lime}}>{initial?"Edit order":"New order"}</div>
          <button onClick={onClose} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",fontSize:18,color:T.muted,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        <div style={G2}>
          <FR label="Customer name"><input style={IS} value={f.customerName} onChange={e=>set("customerName",e.target.value)} placeholder="e.g. Aisha Khan"/></FR>
          <FR label="Item name"><input style={IS} value={f.itemName} onChange={e=>set("itemName",e.target.value)} placeholder="e.g. Y2K Crop Top"/></FR>
        </div>
        <div style={G2}>
          <FR label="Quantity"><input style={IS} type="number" min="1" value={f.qty} onChange={e=>set("qty",Math.max(1,parseInt(e.target.value)||1))}/></FR>
          <FR label="Platform">
            <select style={IS} value={f.platform} onChange={e=>set("platform",e.target.value)}>
              {CONV_PLATFORMS_SELL.map(p=><option key={p}>{p}</option>)}
            </select>
          </FR>
        </div>
        <div style={G2}>
          <FR label="Price bought (₨)"><input style={IS} type="number" value={f.priceBought} onChange={e=>set("priceBought",e.target.value)} placeholder="0"/></FR>
          <FR label="Sold at (₨)"><input style={IS} type="number" value={f.soldAt} onChange={e=>set("soldAt",e.target.value)} placeholder="0"/></FR>
        </div>
        <div style={G2}>
          <FR label="Commission (₨)"><input style={IS} type="number" value={f.commission} onChange={e=>set("commission",e.target.value)} placeholder="0"/></FR>
          <FR label="Expected shipping (₨)"><input style={IS} type="number" value={f.expectedShipping} onChange={e=>set("expectedShipping",e.target.value)} placeholder="0"/></FR>
        </div>
        <div style={G2}>
          <FR label="Status">
            <select style={IS} value={f.status} onChange={e=>set("status",e.target.value)}>
              {ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </FR>
          <FR label="Notes"><input style={IS} value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any details…"/></FR>
        </div>

        {/* Live P&L preview */}
        {(f.soldAt||f.priceBought)&&<div style={{background:p>=0?`${T.profit}12`:`${T.loss}12`,border:`1px solid ${p>=0?T.profit:T.loss}44`,borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:T.ghost}}>Sold ₨{parseFloat(f.soldAt||0).toLocaleString()} − Cost ₨{parseFloat(f.priceBought||0).toLocaleString()} − Comm ₨{parseFloat(f.commission||0).toLocaleString()} − Ship ₨{parseFloat(f.expectedShipping||0).toLocaleString()}</div>
          <div style={{fontSize:18,fontWeight:700,color:p>=0?T.profit:T.loss}}>{p>=0?"+":""}₨{p.toLocaleString()}</div>
        </div>}

        {/* Media upload */}
        <FR label="Media (images)">
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
            {(f.media||[]).map((m,i)=>(
              <div key={i} style={{position:"relative",width:64,height:64,borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`}}>
                <img src={m.url} alt={m.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <button onClick={()=>removeMedia(i)} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.7)",border:"none",borderRadius:"50%",width:18,height:18,cursor:"pointer",color:"#fff",fontSize:11,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            ))}
            <label style={{width:64,height:64,borderRadius:8,border:`2px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.lime,fontSize:22,flexShrink:0}} title="Add media">
              +<input type="file" accept="image/*" multiple onChange={handleMedia} style={{display:"none"}}/>
            </label>
          </div>
        </FR>

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:18,borderTop:`1px solid ${T.border}`}}>
          <button onClick={onClose} style={{padding:"8px 16px",border:`1px solid ${T.border}`,borderRadius:8,background:"transparent",cursor:"pointer",fontSize:13,color:T.muted,fontFamily:FB}}>Cancel</button>
          <button onClick={()=>{if(!f.customerName.trim()&&!f.itemName.trim())return;onSave(f);}} style={{padding:"8px 22px",border:"none",borderRadius:8,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>{initial?"Save changes":"Add order"}</button>
        </div>
      </div>
    </div>
  );
}

function OrderWorkingPage({ orders, setOrders }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const list = orders || [];

  const saveOrder = data => {
    if (editOrder) {
      setOrders(list.map(o=>o.id===editOrder.id?{...o,...data}:o));
      setEditOrder(null);
    } else {
      setOrders([...list, {id:Date.now(),...data}]);
    }
    setFormOpen(false);
  };

  const deleteOrder = id => setOrders(list.filter(o=>o.id!==id));
  const updateStatus = (id,s) => setOrders(list.map(o=>o.id===id?{...o,status:s}:o));

  const filtered = list
    .filter(o=>filterStatus==="all"||o.status===filterStatus)
    .filter(o=>filterPlatform==="all"||o.platform===filterPlatform)
    .filter(o=>!search||(o.customerName+o.itemName).toLowerCase().includes(search.toLowerCase()));

  const totalProfit = filtered.reduce((s,o)=>{
    const p=(parseFloat(o.soldAt)||0)-(parseFloat(o.priceBought)||0)-(parseFloat(o.commission)||0)-(parseFloat(o.expectedShipping)||0);
    return s+p*(o.qty||1);
  },0);
  const totalRevenue = filtered.reduce((s,o)=>(parseFloat(o.soldAt)||0)*(o.qty||1)+s,0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{fontFamily:FB,fontSize:20,fontWeight:700,color:T.offWhite,flex:1}}>Order Working</div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:T.ghost,pointerEvents:"none"}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders…" style={{padding:"7px 12px 7px 28px",border:`1px solid ${T.border}`,borderRadius:9,background:T.card,fontSize:12.5,fontFamily:FB,color:T.offWhite,width:180,outline:"none"}}/>
        </div>
        <button onClick={()=>{setEditOrder(null);setFormOpen(true);}} style={{padding:"7px 20px",border:"none",borderRadius:9,background:T.lime,color:T.ink,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:FB}}>+ New order</button>
      </div>

      <div style={{flex:1,overflowY:"auto",background:T.bg,padding:"18px 20px"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
          {[
            {label:"Total orders",val:filtered.length},
            {label:"Total revenue",val:`₨${totalRevenue.toLocaleString()}`,accent:T.lime},
            {label:"Net profit",val:`₨${totalProfit.toLocaleString()}`,accent:totalProfit>=0?T.profit:T.loss},
            {label:"Delivered",val:filtered.filter(o=>o.status==="Delivered").length},
          ].map(s=>(
            <div key={s.label} style={{background:T.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9.5,color:T.ghost,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px",fontWeight:600}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:700,color:s.accent||T.lime}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:"5px 10px",borderRadius:20,fontSize:12,border:`1px solid ${T.border}`,background:T.card,color:T.muted,fontFamily:FB,outline:"none",cursor:"pointer"}}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)} style={{padding:"5px 10px",borderRadius:20,fontSize:12,border:`1px solid ${T.border}`,background:T.card,color:T.muted,fontFamily:FB,outline:"none",cursor:"pointer"}}>
            <option value="all">All platforms</option>
            {CONV_PLATFORMS_SELL.map(p=><option key={p}>{p}</option>)}
          </select>
          <span style={{fontSize:11.5,color:T.ghost,marginLeft:4}}>{filtered.length} order{filtered.length!==1?"s":""}</span>
        </div>

        {/* Order list */}
        {filtered.length===0
          ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:40,marginBottom:12}}>📦</div><div style={{fontSize:20,fontWeight:700,color:T.ghost}}>No orders yet</div></div>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map(o=>{
              const profit=(parseFloat(o.soldAt)||0)-(parseFloat(o.priceBought)||0)-(parseFloat(o.commission)||0)-(parseFloat(o.expectedShipping)||0);
              const sc=ORDER_STATUS_COL[o.status]||{};
              const expanded=expandedId===o.id;
              return(
                <div key={o.id} style={{background:T.card,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                  {/* Main row */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 120px 100px 100px 100px 100px 80px 88px",gap:0,padding:"14px 16px",alignItems:"center",cursor:"pointer"}} onClick={()=>setExpandedId(expanded?null:o.id)}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.offWhite}}>{o.itemName||"—"}</div>
                      <div style={{fontSize:11,color:T.muted,marginTop:2}}>{o.customerName} · {o.platform} · qty {o.qty||1}</div>
                    </div>
                    <div style={{fontSize:12,color:T.muted}}>₨{parseFloat(o.priceBought||0).toLocaleString()}</div>
                    <div style={{fontSize:12,color:T.lime,fontWeight:600}}>₨{parseFloat(o.soldAt||0).toLocaleString()}</div>
                    <div style={{fontSize:12,color:T.ghost}}>₨{parseFloat(o.commission||0).toLocaleString()}</div>
                    <div style={{fontSize:12,color:T.ghost}}>₨{parseFloat(o.expectedShipping||0).toLocaleString()}</div>
                    <div style={{fontSize:13,fontWeight:700,color:profit>=0?T.profit:T.loss}}>{profit>=0?"+":""}₨{profit.toLocaleString()}</div>
                    <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.color}44`,whiteSpace:"nowrap"}}>{o.status}</span>
                    <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                      <button onClick={e=>{e.stopPropagation();setEditOrder(o);setFormOpen(true);}} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:12,padding:"3px 7px"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.lime} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>✎</button>
                      <button onClick={e=>{e.stopPropagation();deleteOrder(o.id);}} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,cursor:"pointer",color:T.ghost,fontSize:12,padding:"3px 7px"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.rougeText} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>✕</button>
                    </div>
                  </div>

                  {/* Column labels row */}
                  {!expanded&&<div style={{display:"grid",gridTemplateColumns:"1fr 120px 100px 100px 100px 100px 80px 88px",padding:"0 16px 6px",alignItems:"center"}}>
                    {["","Cost","Sold","Comm","Shipping","Profit","Status",""].map((l,i)=><div key={i} style={{fontSize:9,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px"}}>{l}</div>)}
                  </div>}

                  {/* Expanded details */}
                  {expanded&&<div style={{borderTop:`1px solid ${T.border}`,padding:"14px 16px",background:T.surface}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:12}}>
                      {[["Cost (bought at)","₨"+(parseFloat(o.priceBought||0).toLocaleString())],["Sold at","₨"+(parseFloat(o.soldAt||0).toLocaleString())],["Commission","₨"+(parseFloat(o.commission||0).toLocaleString())],["Expected shipping","₨"+(parseFloat(o.expectedShipping||0).toLocaleString())],["Platform",o.platform||"—"],["Quantity",o.qty||1]].map(([k,v])=>(
                        <div key={k} style={{background:T.card,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                          <div style={{fontSize:9.5,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>{k}</div>
                          <div style={{fontSize:14,fontWeight:600,color:T.offWhite}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {o.notes&&<div style={{fontSize:12,color:T.ghost,marginBottom:12,padding:"8px 12px",background:T.card,borderRadius:8,border:`1px solid ${T.border}`}}>{o.notes}</div>}

                    {/* Update status */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
                      <span style={{fontSize:10,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.9px"}}>Status:</span>
                      {ORDER_STATUSES.map(s=>{
                        const a=o.status===s; const sc2=ORDER_STATUS_COL[s]||{};
                        return <button key={s} onClick={()=>updateStatus(o.id,s)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:FB,border:`1px solid ${a?sc2.color:T.border}`,background:a?`${sc2.color}22`:"transparent",color:a?sc2.color:T.muted,fontWeight:a?700:400}}>{s}</button>;
                      })}
                    </div>

                    {/* Media */}
                    {(o.media||[]).length>0&&<div>
                      <div style={{fontSize:10,color:T.ghost,textTransform:"uppercase",letterSpacing:"0.9px",marginBottom:8}}>Media</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {o.media.map((m,i)=>(
                          <img key={i} src={m.url} alt={m.name} onClick={()=>setLightbox(m.url)} style={{width:72,height:72,borderRadius:8,objectFit:"cover",cursor:"pointer",border:`1px solid ${T.border}`}}/>
                        ))}
                      </div>
                    </div>}
                  </div>}
                </div>
              );
            })}
          </div>}
      </div>

      {(formOpen||editOrder)&&<OrderFormModal initial={editOrder} onSave={saveOrder} onClose={()=>{setFormOpen(false);setEditOrder(null);}}/>}

      {/* Lightbox */}
      {lightbox&&<div onClick={()=>setLightbox(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,cursor:"zoom-out"}}>
        <img src={lightbox} style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:12,objectFit:"contain"}}/>
      </div>}
      <AIAssistant
        context={`Current orders (${(orders||[]).length} total):\n${(orders||[]).slice(0,20).map(o=>`- ${o.itemName} | Customer: ${o.customerName} | Bought: ₨${o.priceBought||0} | Sold: ₨${o.soldAt||0} | Status: ${o.status} | Platform: ${o.platform} | Profit: ₨${(parseFloat(o.soldAt)||0)-(parseFloat(o.priceBought)||0)-(parseFloat(o.commission)||0)-(parseFloat(o.expectedShipping)||0)}`).join("\n")}\n\nStats: Total revenue ₨${(orders||[]).reduce((s,o)=>(parseFloat(o.soldAt)||0)*(o.qty||1)+s,0).toLocaleString()}, Net profit ₨${(orders||[]).reduce((s,o)=>s+(parseFloat(o.soldAt)||0)-(parseFloat(o.priceBought)||0)-(parseFloat(o.commission)||0)-(parseFloat(o.expectedShipping)||0),0).toLocaleString()}`}
        systemPrompt={`You are an order management and sales assistant for a secondhand/vintage fashion resale business based in Pakistan.

You have access to the current order list in context. You help with:
- Analysing order performance and profitability
- Identifying which orders/platforms are most profitable
- Flagging orders with low margins or losses
- Summarising pending, shipped, delivered orders
- Advice on shipping, commissions, and pricing strategy
- Tracking customer patterns

Be concise and direct. Give concrete numbers and actionable insights. Respond in plain text, no markdown.`}
        placeholder={"Ask me about your orders, customers, or profitability.\n\nExamples:\n• 'Which orders have the highest profit?'\n• 'How many orders are still pending?'\n• 'What's my average profit per order?'\n• 'Which platform is performing best?'"}
      />
    </div>
  );
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

function LoginScreen({onLogin}){
  const[user,setUser]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState(false);
  const[show,setShow]=useState(false);
  useEffect(()=>{
    if(!document.getElementById("rl-font")){
      const l=document.createElement("link");
      l.id="rl-font";l.rel="stylesheet";
      l.href="https://fonts.googleapis.com/css2?family=Lato:wght@100;700&family=Google+Sans:wght@400;500;700&display=swap";
      document.head.appendChild(l);
    }
  },[]);
  const submit=()=>{
    const u=USERS[user.trim()];
    if(u&&pass===u.password){onLogin(user.trim(),u.role);}
    else{setErr(true);setTimeout(()=>setErr(false),2500);}
  };
  return <div style={{fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",width:"100vw",background:T.bg,position:"fixed",top:0,left:0,margin:0,padding:0,boxSizing:"border-box"}}>
    <div style={{background:T.surface,borderRadius:20,border:`1px solid ${T.border}`,padding:"40px 36px",width:380,boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:8}}>
          <div style={{lineHeight:1}}>
            <span style={{fontFamily:"'Lato',sans-serif",fontSize:40,fontWeight:100,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Re</span>
            <span style={{fontFamily:"'Lato',sans-serif",fontSize:40,fontWeight:700,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Loop</span>
          </div>
          <img src="https://res.cloudinary.com/daw3s99fs/image/upload/f_auto,q_auto/WhatsApp_Image_2026-06-08_at_19.43.43-removebg-preview_fcadkj" alt="ReLoop icon" style={{width:44,height:44,objectFit:"contain",flexShrink:0}}/>
        </div>
        <div style={{fontSize:12,color:T.ghost}}>Inventory Management Platform</div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px"}}>Username</label>
        <input value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter username" style={{...INP,background:T.card}}/>
      </div>
      <div style={{marginBottom:24,position:"relative"}}>
        <label style={{fontSize:10,color:T.ghost,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.9px"}}>Password</label>
        <div style={{position:"relative"}}>
          <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} type={show?"text":"password"} placeholder="Enter password" style={{...INP,background:T.card,paddingRight:40}}/>
          <button onMouseDown={e=>{e.preventDefault();setShow(s=>!s);}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.ghost,fontSize:14,padding:0}}>{show?"🙈":"👁"}</button>
        </div>
      </div>
      {err&&<div style={{background:T.rougeBg,border:`1px solid ${T.rougeText}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:T.rougeText,marginBottom:16,textAlign:"center"}}>Incorrect username or password</div>}
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
    if(!document.getElementById("rl-font")){const l=document.createElement("link");l.id="rl-font";l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Lato:wght@100;700&family=Google+Sans:wght@400;500;700&display=swap";document.head.appendChild(l);}
  },[]);

  const[brands,setBrands]=useState(initBrands);
  const[items,setItems]=useState(initItems);
  const[nid,setNid]=useState(7);
  const[catTree,setCatTree]=useState({encore:{...BRAND_CATS.encore},generic:{...GENERIC_CATS}});
  const[fixes,setFixes]=useState([]);
  const[rates,setRates]=useState(DEFAULT_RATES);
  const[rateHistory,setRateHistory]=useState([]);
  const[bundles,setBundles]=useState([]);
  const[attendance,setAttendance]=useState({members:[],absences:[]});
  const[orders,setOrders]=useState([]);
  const[loaded,setLoaded]=useState(false);

  // ── Collapsible sidebar sections ──────────────────────────────────────────
  const[verticalsOpen,setVerticalsOpen]=useState(true);
  const[modulesOpen,setModulesOpen]=useState(true);

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
        if(d.rateHistory)    setRateHistory(d.rateHistory);
        if(d.bundles)        setBundles(d.bundles);
        if(d.attendance)     setAttendance(d.attendance);
        if(d.orders)         setOrders(d.orders);
      } else {
        sbSet({ brands:initBrands, items:initItems, nid:7, catTree:{encore:{...BRAND_CATS.encore},generic:{...GENERIC_CATS}}, fixes:[], rates:DEFAULT_RATES, bundles:[] });
      }
      setLoaded(true);
    })();
  },[]);

  // ── Persist to Supabase whenever state changes ────────────────────────────
  const persist = (overrides={}) => {
    sbSet({ brands, items, nid, catTree, fixes, rates, rateHistory, bundles, attendance, orders, ...overrides });
  };
  useEffect(()=>{ if(!loaded) return; persist(); },[brands,items,nid,catTree,fixes,rates,rateHistory,bundles,attendance,orders,loaded]);

  const saveBrands = next => {
    setBrands(next);
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

  const saveNewItem=d=>{setItems(p=>[...p,{id:nid,...d}]);setNid(n=>n+1);setAddItemOpen(false);};
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
  const headerScrollRef=useRef(null);
  const bodyScrollRef=useRef(null);
  const syncHeaderScroll=e=>{if(headerScrollRef.current)headerScrollRef.current.scrollLeft=e.target.scrollLeft;};

  return(
    // ── Root: full viewport, no border-radius, no extra margin ──────────────
    <div
      onClick={()=>setColorPickerId(null)}
      style={{
        fontFamily:FB,
        display:"flex",
        height:"100vh",
        width:"100vw",
        background:T.bg,
        overflow:"hidden",
        position:"fixed",
        top:0, left:0,
      }}
    >

      {/* SIDEBAR — full height, no gap */}
      <aside style={{
        width:218,
        flexShrink:0,
        background:T.surface,
        borderRight:`1px solid ${T.border}`,
        display:"flex",
        flexDirection:"column",
        height:"100%",
        overflow:"hidden",
      }}>
        {/* Logo + user block */}
        <div style={{padding:"20px 18px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,lineHeight:1}}>
            <div>
              <span style={{fontFamily:"'Lato',sans-serif",fontSize:32,fontWeight:100,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Re</span>
              <span style={{fontFamily:"'Lato',sans-serif",fontSize:32,fontWeight:700,color:T.lime,letterSpacing:"1.5px",textTransform:"uppercase"}}>Loop</span>
            </div>
            <img src="https://res.cloudinary.com/daw3s99fs/image/upload/f_auto,q_auto/WhatsApp_Image_2026-06-08_at_19.43.43-removebg-preview_fcadkj" alt="ReLoop icon" style={{width:36,height:36,objectFit:"contain",flexShrink:0}}/>
          </div>
          <div style={{fontSize:10.5,color:T.ghost,marginTop:4}}>Inventory Management Platform</div>
          <div style={{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:isAdmin?`${T.lime}22`:T.cobaltBg,color:isAdmin?T.lime:T.cobaltText,fontWeight:600,border:`1px solid ${isAdmin?T.lime:T.cobaltText}44`}}>{isAdmin?"Admin":"Ninja 🥷🏻"}</span>
            <button onClick={()=>{localStorage.removeItem("rl_auth");localStorage.removeItem("rl_role");window.location.reload();}} style={{fontSize:10,color:T.ghost,background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:FB}}>Sign out</button>
          </div>
        </div>

        {/* Scrollable nav */}
        <div style={{padding:"14px 14px 16px",overflowY:"auto",flex:1}}>

          {/* ── VERTICALS section ── */}
          <div style={{marginBottom: verticalsOpen ? 10 : 6}}>
            <SectionHeader label="Verticals" collapsed={!verticalsOpen} onToggle={()=>setVerticalsOpen(o=>!o)}/>
            {verticalsOpen && (
              <div>
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
              </div>
            )}
          </div>

          {/* ── MODULES section ── */}
          <div style={{marginTop: verticalsOpen ? 18 : 6}}>
            <SectionHeader label="Modules" collapsed={!modulesOpen} onToggle={()=>setModulesOpen(o=>!o)}/>
            {modulesOpen && (
              <div>
                {[
                  {icon:"🗂",label:"Inventory",page:"inventory"},
                  {icon:"🗃️",label:"Category Tree",page:"categories"},
                  {icon:"🧵",label:"Jobs",page:"fixes"},
                  {icon:"📦",label:"Bundles",page:"bundles"},
                  {icon:"💱",label:"Conversion",page:"conversion"},
                  {icon:"🗓️",label:"Attendance",page:"attendance"},
                  {icon:"📋",label:"Order Working",page:"orders"},
                  {icon:"🤖",label:"Profit Bot",page:"profitbot"},
                  {icon:"🧾",label:"Sales ↗",page:null},
                  {icon:"📊",label:"Analytics ↗",page:null},
                  {icon:"🤝",label:"Suppliers ↗",page:null},
                ].map(n=>(
                  <button key={n.label} onClick={n.page?()=>setActivePage(n.page):undefined}
                    style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",borderRadius:8,border:"none",background:activePage===n.page?T.card:"transparent",cursor:n.page?"pointer":"default",width:"100%",textAlign:"left",fontSize:12.5,color:activePage===n.page?T.lime:T.muted,fontFamily:FB,marginBottom:2,fontWeight:activePage===n.page?500:400}}>
                    <span style={{fontSize:14}}>{n.icon}</span>{n.label}
                    {activePage===n.page&&<span style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:T.lime,display:"inline-block"}}/>}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:T.bg,height:"100%",overflow:"hidden"}}>
        {activePage==="categories"?<CategoriesPage catTree={catTree} setCatTree={setCatTree} brands={brands}/>
        :activePage==="fixes"?<FixesPage fixes={fixes} setFixes={setFixes} items={items} brands={brands}/>
        :activePage==="bundles"?<BundlesPage items={items} bundles={bundles} setBundles={setBundles} brands={brands}/>
        :activePage==="conversion"?<ConversionPage rates={rates} setRates={r=>{setRates(r);sbSet({brands,items,nid,catTree,fixes,rates:r,rateHistory,bundles,attendance});}} rateHistory={rateHistory} setRateHistory={rh=>{setRateHistory(rh);sbSet({brands,items,nid,catTree,fixes,rates,rateHistory:rh,bundles,attendance});}}/>
        :activePage==="attendance"?<AttendancePage attendance={attendance} isAdmin={isAdmin} setAttendance={a=>{setAttendance(a);sbSet({brands,items,nid,catTree,fixes,rates,rateHistory,bundles,attendance:a,orders});}}/>
        :activePage==="orders"?<OrderWorkingPage orders={orders} setOrders={o=>{setOrders(o);sbSet({brands,items,nid,catTree,fixes,rates,rateHistory,bundles,attendance,orders:o});}}/>
        :activePage==="profitbot"?<ProfitBotPage rates={rates}/>
        :(
          <>
            {/* Top bar */}
            <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
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

            {/* Scrollable content */}
            <div style={{padding:"18px 20px",flex:1,overflowY:"auto",background:T.bg}}>
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
                :<div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden",position:"relative"}}>
                  {/* Full-width header background strip — sits behind everything */}
                  <div style={{position:"absolute",top:0,left:0,right:0,height:40,background:T.card,borderRadius:"12px 12px 0 0",borderBottom:`1px solid ${T.border}`,zIndex:1,pointerEvents:"none"}}/>
                  {/* Single scroll container — header + body scroll together */}
                  <div style={{overflowX:"auto"}}>
                  <div style={{width:"100%",minWidth:TOTAL_W+16}}>
                    <div style={{display:"flex",alignItems:"center",padding:"0 8px",height:40,position:"relative",zIndex:2}}>
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
                          style={{display:"flex",alignItems:"center",padding:"0 8px",borderBottom:isLast?"none":`1px solid ${T.border}`,cursor:"pointer",background:detail?.id===it.id?T.cardHov:"transparent",transition:"background 0.12s",minHeight:52,minWidth:TOTAL_W+16,width:"100%",boxSizing:"border-box"}}>
                          <TCell w={COLS[0].w} left><span style={{fontSize:13,fontWeight:500,color:T.offWhite,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block",width:"100%"}}>{it.name}</span></TCell>
                          <TCell w={COLS[1].w}><span style={{fontSize:11,fontWeight:600,color:bc}}>{b?.name}</span></TCell>
                          <TCell w={COLS[2].w}><span style={{fontSize:12,color:T.muted}}>{it.category}</span></TCell>
                          <TCell w={COLS[3].w}><span style={{fontSize:12,color:T.muted}}>{it.subcategory||"—"}</span></TCell>
                          <TCell w={COLS[4].w}><span style={{fontSize:12,fontWeight:600,color:(it.qty||1)>1?T.cobaltText:T.ghost}}>{it.qty||1}</span></TCell>
                          <TCell w={COLS[5].w}>{sizeLabel(it)==="—"?<span style={{fontSize:12,color:T.ghost}}>—</span>:<span style={{fontSize:11,fontWeight:600,color:T.cobaltText,background:T.cobaltBg,padding:"2px 8px",borderRadius:20}}>{sizeLabel(it)}</span>}</TCell>
                          <TCell w={COLS[6].w}>{it.grade?<span style={{fontSize:12,fontWeight:700,color:T.lime,background:`${T.lime}18`,padding:"2px 8px",borderRadius:6,border:`1px solid ${T.lime}30`}}>{it.grade}</span>:<span style={{color:T.ghost,fontSize:12}}>—</span>}</TCell>
                          <TCell w={COLS[7].w}><span style={{fontSize:11,color:T.ghost,fontFamily:"monospace",letterSpacing:"0.3px"}}>{it.sku||"—"}</span></TCell>
                          <TCell w={COLS[8].w}><StatusPill status={it.status}/></TCell>
                          <TCell w={COLS[9].w}><span style={{fontSize:12,color:T.muted}}>{isAdmin?`₨${it.cost.toLocaleString()}`:"*****"}</span></TCell>
                          <TCell w={COLS[10].w}>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:13,fontWeight:700,color:T.lime}}>{isAdmin?`${sym}${it.price.toLocaleString()}`:"*****"}</div>
                              {isAdmin&&it.currency&&it.currency!=="PKR"&&it.price>0&&<div style={{fontSize:10,color:T.ghost}}>₨{pricePKR.toLocaleString()}</div>}
                            </div>
                          </TCell>
                          <TCell w={COLS[11].w} left><span style={{fontSize:11,color:T.ghost,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block",width:"100%"}}>{it.notes||"—"}</span></TCell>
                          <TCell w={COLS[12].w}><span style={{fontSize:12,fontWeight:700,color:prof>=0?T.profit:T.loss}}>{isAdmin?(prof>=0?"+":"")+"₨"+prof.toLocaleString():"*****"}</span></TCell>
                          <TCell w={COLS[13].w}><div style={{display:"flex",gap:6,justifyContent:"center"}}><IconBtn title="Edit" onClick={e=>{e.stopPropagation();setEditItem(it);}}/><IconBtn title="Delete" danger onClick={e=>{e.stopPropagation();delItem(it.id);}}/></div></TCell>
                        </div>
                      );
                    })}
                  </div>
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
                <IconBtn title="Edit" onClick={()=>setEditItem(it)}/><IconBtn title="Delete" danger onClick={()=>delItem(it.id)}/><button onClick={()=>setDetail(null)} title="Close" style={{padding:"5px 7px",border:`1px solid ${T.border}`,borderRadius:6,background:"transparent",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",color:T.muted,fontSize:14,lineHeight:1,fontFamily:FB}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.lime;e.currentTarget.style.color=T.lime;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>✕</button>
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
              {[["SKU",it.sku||"—"],it.inventoryDate&&["Inventoried",it.inventoryDate],(it.qty||1)>1&&["Qty",it.qty],["Category",it.category],["Subcat",it.subcategory||"—"],["Size",sizeLabel(it)],it.grade&&["Grade",it.grade],it.notes&&["Notes",it.notes],it.status==="reserved"&&it.reservedFor&&["Reserved for",it.reservedFor],it.status==="reserved"&&it.reservedPlatform&&["Via",it.reservedPlatform]].filter(Boolean).map(([k,v])=>(
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
