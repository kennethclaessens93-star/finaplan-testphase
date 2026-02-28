import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◉" },
  { id: "budget", label: "Budget Split", icon: "◔" },
  { id: "expenses", label: "Expenses", icon: "◈" },
  { id: "emergency", label: "Emergency Fund", icon: "◇" },
  { id: "debt", label: "Debt Payoff", icon: "◆" },
  { id: "savings", label: "Savings & HYSA", icon: "▣" },
  { id: "invest", label: "Investments", icon: "△" },
  { id: "tips", label: "Tips & Advice", icon: "✦" },
  { id: "learn", label: "Learn", icon: "◎" },
  { id: "academy", label: "Academy", icon: "🎓", secret: true },
];

const CURRENCIES = [
  {code:"USD",symbol:"$",name:"US Dollar",rate:1},{code:"EUR",symbol:"€",name:"Euro",rate:0.92},
  {code:"GBP",symbol:"£",name:"British Pound",rate:0.79},{code:"JPY",symbol:"¥",name:"Japanese Yen",rate:149.5},
  {code:"CAD",symbol:"C$",name:"Canadian Dollar",rate:1.36},{code:"AUD",symbol:"A$",name:"Australian Dollar",rate:1.53},
  {code:"CHF",symbol:"Fr",name:"Swiss Franc",rate:0.88},{code:"CNY",symbol:"¥",name:"Chinese Yuan",rate:7.24},
  {code:"INR",symbol:"₹",name:"Indian Rupee",rate:83.1},{code:"MXN",symbol:"Mex$",name:"Mexican Peso",rate:17.15},
  {code:"BRL",symbol:"R$",name:"Brazilian Real",rate:4.97},{code:"KRW",symbol:"₩",name:"South Korean Won",rate:1320},
  {code:"SEK",symbol:"kr",name:"Swedish Krona",rate:10.42},{code:"NOK",symbol:"kr",name:"Norwegian Krone",rate:10.55},
  {code:"DKK",symbol:"kr",name:"Danish Krone",rate:6.87},{code:"PLN",symbol:"zł",name:"Polish Zloty",rate:4.02},
  {code:"TRY",symbol:"₺",name:"Turkish Lira",rate:30.2},{code:"THB",symbol:"฿",name:"Thai Baht",rate:35.1},
  {code:"AED",symbol:"د.إ",name:"UAE Dirham",rate:3.67},{code:"SAR",symbol:"﷼",name:"Saudi Riyal",rate:3.75},
  {code:"ZAR",symbol:"R",name:"South African Rand",rate:18.6},{code:"SGD",symbol:"S$",name:"Singapore Dollar",rate:1.34},
  {code:"HKD",symbol:"HK$",name:"Hong Kong Dollar",rate:7.82},{code:"NZD",symbol:"NZ$",name:"New Zealand Dollar",rate:1.63},
  {code:"ILS",symbol:"₪",name:"Israeli Shekel",rate:3.65},{code:"PHP",symbol:"₱",name:"Philippine Peso",rate:55.8},
  {code:"CZK",symbol:"Kč",name:"Czech Koruna",rate:22.8},{code:"CLP",symbol:"CL$",name:"Chilean Peso",rate:880},
  {code:"EGP",symbol:"E£",name:"Egyptian Pound",rate:30.9},{code:"NGN",symbol:"₦",name:"Nigerian Naira",rate:1550},
];
let _currency = "USD";
let _rate = 1;
const setCurrencyGlobal = (code) => { const c = CURRENCIES.find(c=>c.code===code); if(c){_currency=c.code;_rate=c.rate;} };
const conv = (n) => n * _rate;
const formatCurrency = (n) => new Intl.NumberFormat("en-US", { style:"currency", currency:_currency, minimumFractionDigits:0, maximumFractionDigits:0 }).format(conv(n));
const formatCurrencyFull = (n) => new Intl.NumberFormat("en-US", { style:"currency", currency:_currency, minimumFractionDigits:2 }).format(conv(n));

const MILESTONES = [
  { key: "emergency_5", check: (s) => s.emergency.target > 0 && s.emergency.saved / s.emergency.target >= 0.05, msg: "You've saved 5% of your emergency fund! Every dollar counts.", icon: "🌱", color: "#6ee7b7" },
  { key: "emergency_25", check: (s) => s.emergency.target > 0 && s.emergency.saved / s.emergency.target >= 0.25, msg: "25% of your emergency fund is secured! Real safety.", icon: "🛡️", color: "#6ee7b7" },
  { key: "emergency_50", check: (s) => s.emergency.target > 0 && s.emergency.saved / s.emergency.target >= 0.50, msg: "Halfway to a fully-funded emergency fund! Incredible.", icon: "⚡", color: "#6ee7b7" },
  { key: "emergency_100", check: (s) => s.emergency.target > 0 && s.emergency.saved / s.emergency.target >= 1.0, msg: "Emergency fund fully funded! True financial security.", icon: "🏆", color: "#fbbf24" },
  { key: "debt_first_paid", check: (s) => s.debts.length > 0 && s.debts.some(d => d.balance === 0), msg: "You've paid off a debt! Snowball momentum!", icon: "🎉", color: "#38bdf8" },
  { key: "debt_half", check: (s) => { const orig = s.debts.reduce((a,d) => a + (d.originalBalance||d.balance), 0); const cur = s.debts.reduce((a,d) => a + d.balance, 0); return orig > 0 && cur / orig <= 0.5; }, msg: "Crushed more than half your total debt!", icon: "🔥", color: "#f87171" },
  { key: "debt_free", check: (s) => s.debts.length > 0 && s.debts.every(d => d.balance === 0), msg: "YOU ARE DEBT FREE! Celebrate big!", icon: "🚀", color: "#fbbf24" },
  { key: "savings_first", check: (s) => s.savings.some(g => g.target > 0 && g.saved / g.target >= 1.0), msg: "You've reached a savings goal!", icon: "⭐", color: "#38bdf8" },
  { key: "invest_1k", check: (s) => s.investments.reduce((a, i) => a + i.currentValue, 0) >= 1000, msg: "Investments crossed $1,000! Money working for you.", icon: "📈", color: "#a78bfa" },
  { key: "invest_10k", check: (s) => s.investments.reduce((a, i) => a + i.currentValue, 0) >= 10000, msg: "$10K invested! Compound interest is your friend.", icon: "💎", color: "#a78bfa" },
  { key: "invest_50k", check: (s) => s.investments.reduce((a, i) => a + i.currentValue, 0) >= 50000, msg: "$50K invested! Building serious wealth.", icon: "👑", color: "#fbbf24" },
  { key: "net_positive", check: (s) => { const a = s.emergency.saved + s.savings.reduce((x,g) => x+g.saved,0) + s.investments.reduce((x,i) => x+i.currentValue,0); const l = s.debts.reduce((x,d) => x+d.balance,0); return a > l && l > 0; }, msg: "Assets exceed debts — positive net worth!", icon: "🌟", color: "#6ee7b7" },
];

function MilestoneToast({ milestone, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 400); }, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed",top:80,right:16,zIndex:1000,maxWidth:380,padding:"16px 20px",borderRadius:16,background:"rgba(15,23,42,0.95)",border:`1px solid ${milestone.color}30`,backdropFilter:"blur(20px)",boxShadow:`0 8px 32px ${milestone.color}20`,transform:visible?"translateY(0)":"translateY(20px)",opacity:visible?1:0,transition:"all 0.4s cubic-bezier(.4,0,.2,1)",display:"flex",alignItems:"flex-start",gap:14 }}>
      <div style={{ width:44,height:44,borderRadius:12,flexShrink:0,background:`${milestone.color}15`,border:`1px solid ${milestone.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{milestone.icon}</div>
      <div style={{ flex:1 }}><div style={{ fontSize:11,fontWeight:700,color:milestone.color,textTransform:"uppercase",letterSpacing:1,marginBottom:4 }}>Milestone Reached!</div><div style={{ fontSize:13,color:"#e2e8f0",lineHeight:1.5 }}>{milestone.msg}</div></div>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 400); }} style={{ background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:18,padding:0 }}>×</button>
    </div>
  );
}

function MiniBar({ value, max, color = "#6ee7b7", height = 8 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (<div style={{ width:"100%",height,borderRadius:height,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}><div style={{ width:`${pct}%`,height:"100%",borderRadius:height,background:color,transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }} /></div>);
}

function DonutChart({ segments, size = 180, thickness = 28, centerLabel, centerSub }) {
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, total = segments.reduce((s, seg) => s + seg.value, 0);
  let accum = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness} />
      {segments.map((seg, i) => { const pct = total > 0 ? seg.value / total : 0; const dl = pct * c; const off = total > 0 ? -(accum / total) * c : 0; accum += seg.value; return (<circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth={thickness} strokeDasharray={`${dl} ${c-dl}`} strokeDashoffset={-off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition:"all 0.8s cubic-bezier(.4,0,.2,1)" }} />); })}
      <text x={size/2} y={size/2-6} textAnchor="middle" fill="#e2e8f0" fontSize="20" fontWeight="700" fontFamily="'DM Sans',sans-serif">{centerLabel || formatCurrency(total)}</text>
      <text x={size/2} y={size/2+14} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="'DM Sans',sans-serif">{centerSub || "total"}</text>
    </svg>
  );
}

function Card({ children, style }) { return (<div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:24,backdropFilter:"blur(20px)",...style }}>{children}</div>); }

function Slider({ label, value, onChange, min = 0, max = 100, color = "#6ee7b7", suffix = "%", step = 1 }) {
  return (<div style={{ marginBottom:16 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:13,color:"#94a3b8" }}>{label}</span><span style={{ fontSize:13,fontWeight:600,color }}>{value}{suffix}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width:"100%",height:6,borderRadius:6,appearance:"none",background:`linear-gradient(to right, ${color} 0%, ${color} ${((value-min)/(max-min))*100}%, rgba(255,255,255,0.08) ${((value-min)/(max-min))*100}%, rgba(255,255,255,0.08) 100%)`,outline:"none",cursor:"pointer" }} /></div>);
}

function Field({ label, value, onChange, type = "number", prefix, placeholder }) {
  return (<div style={{ marginBottom:14 }}>{label && <label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:4 }}>{label}</label>}<div style={{ position:"relative" }}>{prefix && <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#64748b",fontSize:14 }}>{prefix}</span>}<input type={type} value={value} onChange={(e) => onChange(type === "number" ? Number(e.target.value) || 0 : e.target.value)} placeholder={placeholder} style={{ width:"100%",padding:prefix?"10px 12px 10px 28px":"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e2e8f0",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box" }} /></div></div>);
}

function Btn({ children, onClick, variant = "primary", style: s, small }) {
  const bg = variant === "primary" ? "linear-gradient(135deg,#6ee7b7,#34d399)" : variant === "danger" ? "linear-gradient(135deg,#f87171,#ef4444)" : "rgba(255,255,255,0.06)";
  return (<button onClick={onClick} style={{ padding:small?"6px 14px":"10px 20px",background:bg,border:variant==="ghost"?"1px solid rgba(255,255,255,0.1)":"none",borderRadius:10,color:variant==="ghost"?"#94a3b8":"#0f172a",fontSize:small?12:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",...s }}>{children}</button>);
}

// ═══ DASHBOARD ═══
function Dashboard({ income, expenses, savings, debts, emergency, investments, compactMode, cleanMode, moneyLeft, altDash, setAltDash, minDebtPayment, showHealthBars, setShowHealthBars }) {
  const [showFull, setShowFull] = useState(false);
  const te = expenses.reduce((s,e) => s+e.amount, 0), td = debts.reduce((s,d) => s+d.balance, 0);
  const ti2 = investments.reduce((s,i) => s+i.currentValue, 0);
  const ts = savings.reduce((s,g) => s+g.saved, 0), tg = savings.reduce((s,g) => s+g.target, 0);
  const ti = investments.reduce((a,i) => a+i.currentValue, 0), tc = investments.reduce((a,i) => a+i.totalContributed, 0);
  const ig = ti - tc, nw = emergency.saved + ts + ti - td;
  const stats = [
    { label:"Monthly Income", value:formatCurrency(income), color:"#6ee7b7", sub:"after tax" },
    { label:"Total Expenses", value:formatCurrency(te), color:"#f87171", sub:`${((te/(income||1))*100).toFixed(0)}% of income` },
    { label:"Net Worth", value:formatCurrency(nw), color:nw>=0?"#6ee7b7":"#f87171", sub:nw>=0?"assets − debt":"negative" },
    { label:"Portfolio Value", value:formatCurrency(ti), color:"#a78bfa", sub:ig>=0?`+${formatCurrency(ig)} gains`:`${formatCurrency(ig)} loss` },
  ];
  if (altDash) return (<div>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}><div style={{ fontSize:18,fontWeight:700,color:"#e2e8f0" }}>Command Center</div><button onClick={() => setAltDash(false)} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#94a3b8",fontSize:10,cursor:"pointer",padding:"4px 10px",fontFamily:"'DM Sans',sans-serif" }}>Standard View</button></div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <Card><div style={{ textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:4 }}>Money Left This Month</div><div style={{ fontSize:32,fontWeight:800,color:moneyLeft>=0?"#6ee7b7":"#f87171" }}>{formatCurrency(moneyLeft)}</div><div style={{ fontSize:10,color:"#475569" }}>Income - Expenses - Min Debt</div></div></Card>
      <Card><div style={{ textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:4 }}>Total Debt Remaining</div><div style={{ fontSize:32,fontWeight:800,color:"#f87171" }}>{formatCurrency(td)}</div><div style={{ fontSize:10,color:"#475569" }}>{debts.reduce((s,d)=>s+d.originalBalance,0)>0?((debts.reduce((s,d)=>s+(d.originalBalance-d.balance),0)/debts.reduce((s,d)=>s+d.originalBalance,0))*100).toFixed(0):100}% eliminated</div></div></Card>
      <Card><div style={{ textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:4 }}>Emergency Fund</div><div style={{ fontSize:32,fontWeight:800,color:"#6ee7b7" }}>{formatCurrency(emergency.saved)}</div><div style={{ fontSize:10,color:"#475569" }}>{emergency.target>0?(emergency.saved/emergency.target*100).toFixed(0):0}% of {formatCurrency(emergency.target)}</div></div></Card>
      <Card><div style={{ textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:4 }}>Investment Growth</div><div style={{ fontSize:32,fontWeight:800,color:"#a78bfa" }}>{formatCurrency(ti2)}</div><div style={{ fontSize:10,color:"#475569" }}>+{formatCurrency(ti2-investments.reduce((s,i)=>s+i.totalContributed,0))} gains</div></div></Card>
    </div>
  </div>);
  return (<div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:16,marginBottom:24 }}>
      {stats.map((st,i) => (<Card key={i}><div style={{ fontSize:12,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",letterSpacing:1,fontWeight:600 }}>{st.label}</div><div style={{ fontSize:28,fontWeight:800,color:st.color,lineHeight:1.2 }}>{st.value}</div><div style={{ fontSize:12,color:"#64748b",marginTop:4 }}>{st.sub}</div></Card>))}
    </div>
    <div style={{ display:"flex",justifyContent:"center",margin:"12px 0" }}><button onClick={() => setAltDash(true)} style={{ padding:"8px 20px",borderRadius:10,background:"linear-gradient(135deg,rgba(56,189,248,0.06),rgba(167,139,250,0.06))",border:"1px solid rgba(56,189,248,0.12)",color:"#38bdf8",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Switch to Command Center</button></div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Expense Breakdown</div>
        <div style={{ display:"flex",alignItems:"center",gap:24 }}>
          <DonutChart segments={expenses.length>0?expenses.map((e,i) => ({ value:e.amount, color:["#6ee7b7","#34d399","#fbbf24","#f87171","#a78bfa","#38bdf8","#fb923c","#e879f9"][i%8] })):[{ value:1, color:"rgba(255,255,255,0.06)" }]} />
          <div style={{ padding:12,borderRadius:10,background:moneyLeft>=0?"rgba(110,231,183,0.06)":"rgba(248,113,113,0.06)",border:`1px solid ${moneyLeft>=0?"rgba(110,231,183,0.1)":"rgba(248,113,113,0.1)"}`,marginBottom:12,textAlign:"center" }}>
              <div style={{ fontSize:9,color:"#64748b" }}>Money Left This Month</div>
              <div style={{ fontSize:20,fontWeight:800,color:moneyLeft>=0?"#6ee7b7":"#f87171" }}>{formatCurrency(moneyLeft)}</div>
              <div style={{ fontSize:9,color:"#475569" }}>after expenses + min debt payments</div>
            </div>
          <div style={{ flex:1 }}>{(cleanMode?expenses.slice(0,4):expenses.slice(0,6)).map((e,i) => (<div key={i} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}><div style={{ width:10,height:10,borderRadius:3,background:["#6ee7b7","#34d399","#fbbf24","#f87171","#a78bfa","#38bdf8","#fb923c","#e879f9"][i%8] }} /><span style={{ fontSize:12,color:"#94a3b8",flex:1 }}>{e.name}</span><span style={{ fontSize:12,fontWeight:600,color:"#e2e8f0" }}>{formatCurrency(e.amount)}</span></div>))}</div>
        </div>
      </Card>
      <Card>
        {(() => {
          const emergencyPct = emergency.target > 0 ? Math.min(emergency.saved / emergency.target, 1) : 0;
          const savingsPct = tg > 0 ? Math.min(ts / tg, 1) : 0;
          const dtiRatio = income > 0 ? td / (income * 12) : 0;
          const expenseRatio = income > 0 ? te / income : 1;
          const hasInv = ti > 0;
          const savingsRate = income > 0 ? Math.max(0, (income - te) / income) : 0;
          const nwToInc = income > 0 ? nw / (income * 12) : 0;
          const portShare = nw > 0 ? ti / nw : 0;

          const eS = Math.round(emergencyPct * 20);
          const dS = Math.round(Math.max(0, 1 - dtiRatio * 2) * 20);
          const sS = Math.round((savingsPct * 0.4 + (hasInv ? 0.6 : 0)) * 20);
          const bS = Math.round(Math.min(1, savingsRate / 0.3) * 20);
          const rS = Math.round((Math.min(1, Math.max(0, nwToInc)) * 0.5 + Math.min(1, savingsRate > 0.2 ? 1 : savingsRate / 0.2) * 0.5) * 20);
          const tS = Math.min(100, eS + dS + sS + bS + rS);

          const gr = tS >= 85 ? { l:"Excellent",c:"#6ee7b7",i:"🏆",bg:"rgba(110,231,183,0.08)" } : tS >= 70 ? { l:"Good",c:"#34d399",i:"💪",bg:"rgba(52,211,153,0.08)" } : tS >= 55 ? { l:"Fair",c:"#fbbf24",i:"📊",bg:"rgba(251,191,36,0.08)" } : tS >= 35 ? { l:"Needs Work",c:"#fb923c",i:"🔧",bg:"rgba(251,147,60,0.08)" } : { l:"Critical",c:"#f87171",i:"⚠️",bg:"rgba(248,113,113,0.08)" };
          const enc = tS >= 85 ? "You're in fantastic shape — your future self is grateful." : tS >= 70 ? "Solid foundation. Consistently smart choices." : tS >= 55 ? "On the right track. Small improvements compound fast." : tS >= 35 ? "Room to grow — one step at a time. You've got this." : "Tracking your finances is already a powerful first step.";
          const htips = [];
          if (emergencyPct < 0.25) htips.push("Build your emergency fund — aim for 3 months.");
          if (dtiRatio > 0.3) htips.push("DTI is high. Prioritize paying down debt.");
          if (expenseRatio > 0.85) htips.push("Expenses are close to income. Look for cuts.");
          if (!hasInv) htips.push("Start investing — even small amounts compound.");
          if (savingsRate < 0.1) htips.push("Try to save at least 10-20% of income.");



          return (<div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>Financial Health</div>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                {!cleanMode&&<button onClick={() => setShowHealthBars(!showHealthBars)} style={{ background:showHealthBars?"rgba(110,231,183,0.08)":"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:6,color:showHealthBars?"#6ee7b7":"#94a3b8",fontSize:10,padding:"4px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600 }}>{showHealthBars?"Hide Bars":"Health Bars"}</button>}{!cleanMode&&<button onClick={() => setShowFull(!showFull)} style={{ background:showFull?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.04)",border:showFull?"1px solid rgba(167,139,250,0.2)":"1px solid rgba(255,255,255,0.12)",borderRadius:6,color:showFull?"#a78bfa":"#94a3b8",fontSize:10,padding:"4px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600 }}>{showFull?"Simple View":"Full View"}</button>}
                <div style={{ display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:8,background:gr.bg,border:`1px solid ${gr.c}20` }}><span style={{ fontSize:12 }}>{gr.i}</span><span style={{ fontSize:11,fontWeight:700,color:gr.c }}>{gr.l}</span></div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:12 }}>
              <div style={{ position:"relative",width:66,height:66,flexShrink:0 }}>
                <svg width={66} height={66} viewBox="0 0 66 66"><circle cx={33} cy={33} r={27} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5} /><circle cx={33} cy={33} r={27} fill="none" stroke={gr.c} strokeWidth={5} strokeDasharray={`${(tS/100)*169.6} ${169.6-(tS/100)*169.6}`} strokeLinecap="round" transform="rotate(-90 33 33)" style={{ transition:"stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} /></svg>
                <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column" }}><div style={{ fontSize:17,fontWeight:800,color:gr.c,lineHeight:1 }}>{tS}</div><div style={{ fontSize:7,color:"#64748b" }}>/100</div></div>
              </div>
              <div style={{ flex:1 }}><div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5,marginBottom:4 }}>{enc}</div>{!cleanMode&&htips.slice(0,2).map((t,i) => (<div key={i} style={{ fontSize:10,color:"#64748b",lineHeight:1.4,paddingLeft:8,borderLeft:"2px solid rgba(255,255,255,0.06)",marginBottom:2 }}>💡 {t}</div>))}</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:showFull?"repeat(5,1fr)":"1fr 1fr",gap:5,marginBottom:showFull?10:8,display:cleanMode?"none":"grid" }}>
              {[{label:"Emergency",score:eS,max:20,color:"#6ee7b7"},{label:"Debt",score:dS,max:20,color:"#fbbf24"},{label:"Savings",score:sS,max:20,color:"#38bdf8"},{label:"Budget",score:bS,max:20,color:"#a78bfa"},...(showFull?[{label:"Ratios",score:rS,max:20,color:"#fb923c"}]:[])].map((sc,i) => (
                <div key={i} style={{ padding:5,background:"rgba(255,255,255,0.02)",borderRadius:6 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:2 }}><span style={{ fontSize:8,color:"#64748b" }}>{sc.label}</span><span style={{ fontSize:8,fontWeight:700,color:sc.color }}>{sc.score}/{sc.max}</span></div><MiniBar value={sc.score} max={sc.max} color={sc.color} height={3} /></div>
              ))}
            </div>
            {showFull&&!cleanMode&&(<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:10 }}>
              {[{label:"Savings Rate",value:`${(savingsRate*100).toFixed(0)}%`,good:savingsRate>=0.2,warn:savingsRate<0.1},{label:"NW / Annual",value:nwToInc>=0?`${nwToInc.toFixed(1)}x`:`-${Math.abs(nwToInc).toFixed(1)}x`,good:nwToInc>=0.5,warn:nwToInc<0},{label:"Invested",value:`${(portShare*100).toFixed(0)}%`,good:portShare>=0.3,warn:portShare<0.1}].map((r,i) => (
                <div key={i} style={{ padding:6,background:"rgba(255,255,255,0.02)",borderRadius:6,textAlign:"center" }}><div style={{ fontSize:8,color:"#475569" }}>{r.label}</div><div style={{ fontSize:14,fontWeight:700,color:r.good?"#6ee7b7":r.warn?"#f87171":"#fbbf24" }}>{r.value}</div></div>
              ))}
            </div>)}
            {!cleanMode&&showHealthBars&&[{label:"Emergency Fund",saved:emergency.saved,goal:emergency.target,color:"#6ee7b7"},{label:"Savings",saved:ts,goal:tg,color:"#38bdf8"},{label:"Investments",saved:ti,goal:Math.max(ti,tc*1.5||10000),color:"#a78bfa"},{label:"Debt-to-Income",saved:td,goal:income*12,color:td/(income*12||1)>0.36?"#f87171":"#fbbf24"}].map((it,i) => (
              <div key={i} style={{ marginBottom:8 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:2 }}><span style={{ fontSize:10,color:"#94a3b8" }}>{it.label}</span><span style={{ fontSize:10,color:it.color }}>{formatCurrency(it.saved)}{it.goal>0?` / ${formatCurrency(it.goal)}`:""}</span></div><MiniBar value={it.saved} max={it.goal} color={it.color} height={5} /></div>
            ))}
          </div>);
        })()}
      </Card>
    </div>
  </div>);
}

// ═══ BUDGET SPLIT (with Investing) ═══
const PRESETS = {
  smart: { needs:50,wants:25,savings:15,invest:10,label:"🧠 Smart" },
  "50/30/20": { needs:50,wants:30,savings:10,invest:10,label:"50/30/20" },
  "70/20/10": { needs:70,wants:15,savings:5,invest:10,label:"70/20/10" },
  "60/20/20": { needs:60,wants:15,savings:15,invest:10,label:"Balanced" },
  aggressive: { needs:50,wants:15,savings:10,invest:25,label:"Aggressive Investor" },
  custom: { needs:50,wants:25,savings:10,invest:15,label:"Custom" },
};

function BudgetSplit({ income, expenses, debts, emergency, investments, preset, setPreset, splits, setSplits, cleanMode }) {
  const needs = splits.needs, wants = splits.wants, sav = splits.sav, invest = splits.invest;
  const setNeeds = v => setSplits(s=>({...s,needs:v}));
  const setWants = v => setSplits(s=>({...s,wants:v}));
  const setSav = v => setSplits(s=>({...s,sav:v}));
  const setInvest = v => setSplits(s=>({...s,invest:v}));
  const applyPreset = (k) => {
    setPreset(k);
    if (k === "smart") {
      const te = expenses?.reduce((s,e) => s+e.amount, 0) || 0;
      const td = debts?.reduce((s,d) => s+d.balance, 0) || 0;
      const hasHighDebt = td > income * 6;
      const emergFull = emergency?.saved >= emergency?.target;
      const hasInv = investments?.length > 0;
      const expRatio = income > 0 ? te / income : 0.7;
      let n = Math.round(Math.min(65, Math.max(40, expRatio * 100 * 0.9)));
      let w = hasHighDebt ? 10 : 20;
      let s = !emergFull ? 20 : 10;
      let inv = hasInv ? 15 : 10;
      if (hasHighDebt) { s = 15; inv = 5; w = 10; }
      const t = n + w + s + inv;
      if (t !== 100) w += (100 - t);
      setNeeds(n); setWants(w); setSav(s); setInvest(inv);
      return;
    }
    const p=PRESETS[k]; setNeeds(p.needs); setWants(p.wants); setSav(p.savings); setInvest(p.invest);
  };
  const total = needs+wants+sav+invest;
  const nA=(income*needs)/100, wA=(income*wants)/100, sA=(income*sav)/100, iA=(income*invest)/100;
  const handleSlider = (w, v) => { setPreset("custom"); if(w==="needs")setNeeds(v); else if(w==="wants")setWants(v); else if(w==="savings")setSav(v); else setInvest(v); };
  const allocs = [
    { label:"Needs",pct:needs,amt:nA,color:"#6ee7b7",ex:"Rent, groceries, insurance, utilities" },
    { label:"Wants",pct:wants,amt:wA,color:"#38bdf8",ex:"Dining, streaming, hobbies, travel" },
    { label:"Savings",pct:sav,amt:sA,color:"#a78bfa",ex:"Emergency fund, HYSA, goals" },
    { label:"Investing",pct:invest,amt:iA,color:"#fbbf24",ex:"ETFs, index funds, retirement" },
  ];
  const y10 = useMemo(() => Array.from({length:10},(_,y) => { let b=0; for(let m=0;m<(y+1)*12;m++) b=(b+iA)*(1+0.08/12); return b; }), [iA]);

  return (<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
    <Card>
      <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Split Model</div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:20 }}>
        {Object.entries(PRESETS).map(([k,p]) => (<button key={k} onClick={() => applyPreset(k)} style={{ padding:"8px 14px",borderRadius:8,border:preset===k?"1px solid #6ee7b7":"1px solid rgba(255,255,255,0.08)",background:preset===k?"rgba(110,231,183,0.1)":"rgba(255,255,255,0.03)",color:preset===k?"#6ee7b7":"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{p.label}</button>))}
      </div>
      {!cleanMode&&<><Slider label="Needs (housing, food, utilities)" value={needs} onChange={v => handleSlider("needs",v)} color="#6ee7b7" />
      <Slider label="Wants (entertainment, dining)" value={wants} onChange={v => handleSlider("wants",v)} color="#38bdf8" />
      <Slider label="Savings (emergency, HYSA, goals)" value={sav} onChange={v => handleSlider("savings",v)} color="#a78bfa" />
      <Slider label="Investing (ETFs, index funds)" value={invest} onChange={v => handleSlider("invest",v)} color="#fbbf24" />
      <div style={{ textAlign:"center",marginTop:8,fontSize:12,color:total!==100?"#f87171":"#475569",fontWeight:total!==100?700:400 }}>Total: {total}% {total!==100&&`(${total>100?"+":""}${total-100}%)`}</div></>}
      {!cleanMode&&<div style={{ marginTop:20,padding:14,background:"rgba(251,191,36,0.04)",borderRadius:12,border:"1px solid rgba(251,191,36,0.1)" }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#fbbf24",marginBottom:8 }}>10-Year Investment Projection (8% avg return)</div>
        <div style={{ display:"flex",alignItems:"flex-end",gap:3,height:60,marginBottom:6 }}>{y10.map((v,i) => (<div key={i} style={{ flex:1,height:`${(v/(y10[9]||1))*100}%`,background:"linear-gradient(to top, rgba(251,191,36,0.2), rgba(251,191,36,0.5))",borderRadius:"3px 3px 0 0",position:"relative" }}>{i===9&&<div style={{ position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",fontSize:9,color:"#fbbf24",fontWeight:700,whiteSpace:"nowrap" }}>{formatCurrency(v)}</div>}</div>))}</div>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#64748b" }}><span>1yr</span><span>5yr</span><span>10yr</span></div>
        <div style={{ fontSize:10,color:"#94a3b8",marginTop:6 }}>Investing {formatCurrency(iA)}/mo could grow to {formatCurrency(y10[9])} in 10 years</div>
      </div>}
    </Card>
    <Card>
      <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Monthly Allocation</div>
      <div style={{ display:"flex",justifyContent:"center",marginBottom:20 }}><DonutChart size={160} thickness={24} segments={allocs.map(a => ({ value:a.amt, color:a.color }))} /></div>
      {allocs.map((it,i) => (<div key={i} style={{ padding:"12px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.04)":"none" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:8,height:8,borderRadius:2,background:it.color }} /><span style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{it.label}</span>{!cleanMode&&<span style={{ fontSize:12,color:"#64748b" }}>{it.pct}%</span>}</div><span style={{ fontSize:16,fontWeight:700,color:it.color }}>{formatCurrency(it.amt)}</span></div>
        {!cleanMode&&<div style={{ fontSize:11,color:"#475569",marginTop:2,marginLeft:16 }}>{it.ex}</div>}
      </div>))}
      {!cleanMode&&<div style={{ marginTop:16,padding:12,background:"rgba(110,231,183,0.05)",borderRadius:10,border:"1px solid rgba(110,231,183,0.1)" }}>
        <div style={{ fontSize:11,color:"#6ee7b7",fontWeight:600,marginBottom:2 }}>Weekly Breakdown</div>
        <div style={{ fontSize:12,color:"#94a3b8" }}>Needs: {formatCurrency(nA/4.33)} · Wants: {formatCurrency(wA/4.33)} · Save: {formatCurrency(sA/4.33)} · Invest: {formatCurrency(iA/4.33)}</div>
      </div>}
    </Card>
  </div>);
}

// ═══ EXPENSES ═══
const DEFAULT_CATEGORIES = [
  { name:"Housing",icon:"⌂",color:"#6ee7b7" },{ name:"Food & Groceries",icon:"⊕",color:"#34d399" },
  { name:"Transportation",icon:"⊗",color:"#38bdf8" },{ name:"Utilities",icon:"⊘",color:"#fbbf24" },
  { name:"Healthcare",icon:"⊙",color:"#f87171" },{ name:"Entertainment",icon:"⊛",color:"#a78bfa" },
  { name:"Insurance",icon:"⊜",color:"#fb923c" },{ name:"Personal",icon:"⊝",color:"#e879f9" },
];

function Expenses({ expenses, setExpenses, income, cleanMode }) {
  const [nn, setNn] = useState(""); const [na, setNa] = useState(0); const [nc, setNc] = useState("Housing");
  const add = () => { if(!nn||!na) return; setExpenses([...expenses,{ name:nn,amount:na,category:nc,id:Date.now() }]); setNn(""); setNa(0); };
  const rm = (id) => setExpenses(expenses.filter(e => e.id !== id));
  const te = expenses.reduce((s,e) => s+e.amount, 0);
  const byCat = useMemo(() => { const m={}; expenses.forEach(e => { m[e.category]=(m[e.category]||0)+e.amount; }); return Object.entries(m).sort((a,b) => b[1]-a[1]); }, [expenses]);

  return (<div style={{ display:"grid",gridTemplateColumns:cleanMode?"1fr":"1fr 1fr",gap:16 }}>
    {!cleanMode&&<div>
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Add Expense</div>
        <Field label="Expense Name" value={nn} onChange={setNn} type="text" placeholder="e.g. Rent" />
        <Field label="Monthly Amount" value={na||""} onChange={setNa} prefix="$" />
        <div style={{ marginBottom:14 }}><label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:4 }}>Category</label>
          <select value={nc} onChange={e => setNc(e.target.value)} style={{ width:"100%",padding:"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e2e8f0",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none" }}>
            {DEFAULT_CATEGORIES.map(c => (<option key={c.name} value={c.name} style={{ background:"#1e293b" }}>{c.icon} {c.name}</option>))}
          </select></div>
        <Btn onClick={add} style={{ width:"100%" }}>+ Add Expense</Btn>
      </Card>
      <Card>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}><span style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>Summary</span><span style={{ fontSize:14,fontWeight:700,color:te>income?"#f87171":"#6ee7b7" }}>{formatCurrency(te)}</span></div>
        {byCat.map(([cat,amt]) => { const co=DEFAULT_CATEGORIES.find(c => c.name===cat)||{color:"#94a3b8",icon:"·"}; return (<div key={cat} style={{ marginBottom:10 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:12,color:"#94a3b8" }}>{co.icon} {cat}</span><span style={{ fontSize:12,color:"#e2e8f0" }}>{formatCurrency(amt)} <span style={{ color:"#475569" }}>({((amt/(income||1))*100).toFixed(0)}%)</span></span></div><MiniBar value={amt} max={income} color={co.color} height={6} /></div>); })}
      </Card>
    </div>}
    <Card>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}><span style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>All Expenses ({expenses.length})</span><span style={{ fontSize:14,fontWeight:700,color:te>income?"#f87171":"#6ee7b7" }}>{formatCurrency(te)}/mo</span></div>
      <div style={{ maxHeight:500,overflowY:"auto" }}>
        {expenses.length===0&&<div style={{ textAlign:"center",padding:40,color:"#475569",fontSize:13 }}>No expenses added yet.</div>}
        {expenses.map(e => { const co=DEFAULT_CATEGORIES.find(c => c.name===e.category)||{color:"#94a3b8",icon:"·"}; return (
          <div key={e.id} style={{ display:"flex",alignItems:"center",padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ width:36,height:36,borderRadius:10,background:`${co.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginRight:12,flexShrink:0 }}>{co.icon}</div>
            <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{e.name}</div>{!cleanMode&&<div style={{ fontSize:11,color:"#64748b" }}>{e.category}</div>}</div>
            <div style={{ fontSize:14,fontWeight:700,color:"#e2e8f0",marginRight:12 }}>{formatCurrency(e.amount)}</div>
            {!cleanMode&&<button onClick={() => rm(e.id)} style={{ background:"rgba(248,113,113,0.1)",border:"none",borderRadius:6,color:"#f87171",fontSize:16,cursor:"pointer",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>}
          </div>); })}
      </div>
    </Card>
  </div>);
}

// ═══ EMERGENCY FUND ═══
function EmergencyFund({ income, expenses, emergency, setEmergency, cleanMode }) {
  const me = expenses.reduce((s,e) => s+e.amount, 0);
  const rem = Math.max(0, emergency.target - emergency.saved);
  const mtg = emergency.monthlyContribution > 0 ? Math.ceil(rem / emergency.monthlyContribution) : Infinity;
  const pct = emergency.target > 0 ? (emergency.saved / emergency.target) * 100 : 0;
  const mm = pct>=100?{icon:"🏆",text:"Fully funded! You're financially secure.",color:"#fbbf24"}:pct>=75?{icon:"🔥",text:"75% there! Finish line in sight!",color:"#6ee7b7"}:pct>=50?{icon:"⚡",text:"Halfway! Incredible commitment.",color:"#6ee7b7"}:pct>=25?{icon:"🛡️",text:"25% saved. Building real safety!",color:"#6ee7b7"}:pct>=5?{icon:"🌱",text:"Great start! Every dollar matters.",color:"#6ee7b7"}:null;

  if (cleanMode) return (<Card><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>Emergency Fund</div><span style={{ fontSize:11,color:"#6ee7b7",fontWeight:600 }}>{pct.toFixed(0)}% funded</span></div><MiniBar value={emergency.saved} max={emergency.target} color="#6ee7b7" height={10} /><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12 }}><div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Saved</div><div style={{ fontSize:16,fontWeight:700,color:"#6ee7b7" }}>{formatCurrency(emergency.saved)}</div></div><div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Target ({emergency.months}mo)</div><div style={{ fontSize:16,fontWeight:700,color:"#e2e8f0" }}>{formatCurrency(emergency.target)}</div></div><div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Monthly</div><div style={{ fontSize:16,fontWeight:700,color:"#a78bfa" }}>{formatCurrency(emergency.monthlyContribution)}</div></div></div>{mtg > 0 && mtg < Infinity && <div style={{ textAlign:"center",fontSize:11,color:"#94a3b8",marginTop:8 }}>~{mtg} months to fully funded</div>}</Card>);
  return (<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
    <Card>
      <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Emergency Fund Calculator</div>
      <div style={{ fontSize:12,color:"#64748b",marginBottom:16 }}>Monthly essential expenses: <span style={{ color:"#e2e8f0",fontWeight:600 }}>{formatCurrency(me)}</span></div>
      <div style={{ marginBottom:20 }}><label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:8 }}>Target Months of Coverage</label>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>{[3,6,9,12,15,18,24].map(m => (<button key={m} onClick={() => setEmergency({...emergency,months:m,target:me*m})} style={{ padding:"10px 6px",borderRadius:10,border:emergency.months===m?"1px solid #6ee7b7":"1px solid rgba(255,255,255,0.08)",background:emergency.months===m?"rgba(110,231,183,0.1)":"rgba(255,255,255,0.03)",color:emergency.months===m?"#6ee7b7":"#94a3b8",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center" }}>{m}mo</button>))}</div>
      </div>
      <Field label="Amount Already Saved" value={emergency.saved||""} onChange={v => setEmergency({...emergency,saved:v})} prefix="$" />
      <Field label="Monthly Contribution" value={emergency.monthlyContribution||""} onChange={v => setEmergency({...emergency,monthlyContribution:v})} prefix="$" />
    </Card>
    <Card>
      <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Progress & Projection</div>
      <div style={{ textAlign:"center",marginBottom:20 }}><div style={{ fontSize:42,fontWeight:800,color:"#6ee7b7",lineHeight:1 }}>{pct.toFixed(0)}%</div><div style={{ fontSize:12,color:"#64748b",marginTop:4 }}>of {formatCurrency(emergency.target)} goal</div></div>
      <MiniBar value={emergency.saved} max={emergency.target} color="#6ee7b7" height={14} />
      <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#475569" }}><span>{formatCurrency(emergency.saved)}</span><span>{formatCurrency(emergency.target)}</span></div>
      {mm&&<div style={{ marginTop:16,padding:12,background:`${mm.color}08`,borderRadius:10,border:`1px solid ${mm.color}20`,display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:20 }}>{mm.icon}</span><span style={{ fontSize:12,color:mm.color,fontWeight:600 }}>{mm.text}</span></div>}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:16 }}>
        <div style={{ padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10 }}><div style={{ fontSize:11,color:"#64748b",marginBottom:2 }}>Remaining</div><div style={{ fontSize:18,fontWeight:700,color:"#e2e8f0" }}>{formatCurrency(rem)}</div></div>
        <div style={{ padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10 }}><div style={{ fontSize:11,color:"#64748b",marginBottom:2 }}>Time to Goal</div><div style={{ fontSize:18,fontWeight:700,color:"#6ee7b7" }}>{mtg<Infinity?`${Math.floor(mtg/12)}y ${mtg%12}m`:"—"}</div></div>
      </div>
    </Card>
  </div>);
}

// ═══ DEBT COMMAND CENTER (Unified: Strategy + Bills + Smart Advisor + Calendar Sync) ═══
const URGENCY_LEVELS = [
  { value:1, label:"1st Notice", color:"#fbbf24", bg:"rgba(251,191,36,0.1)", weight:1 },
  { value:2, label:"2nd Notice", color:"#fb923c", bg:"rgba(251,147,60,0.1)", weight:2 },
  { value:3, label:"3rd Notice", color:"#f87171", bg:"rgba(248,113,113,0.1)", weight:3 },
  { value:4, label:"Final Notice", color:"#ef4444", bg:"rgba(239,68,68,0.15)", weight:5 },
  { value:5, label:"Collections", color:"#dc2626", bg:"rgba(220,38,38,0.2)", weight:8 },
  { value:6, label:"Court", color:"#7f1d1d", bg:"rgba(127,29,29,0.25)", weight:12 },
];
function getUL(u) { return URGENCY_LEVELS.find(l => l.value===u)||URGENCY_LEVELS[0]; }
function daysUntil(ds) { if(!ds) return Infinity; return Math.ceil((new Date(ds)-new Date())/(864e5)); }
function fmtDate(ds) { if(!ds) return "—"; const d=new Date(ds); return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }

function DebtPayoff({ debts, setDebts, bills, setBills, compactMode, cleanMode, totalOrigDebt, calendarEnabled, onToggleCalendar, onSyncCalendar }) {
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [strategy, setStrategy] = useState("smart");
  const [extra, setExtra] = useState(200);
  const [debouncedExtra, setDebouncedExtra] = useState(200);
  useEffect(() => { const t = setTimeout(() => setDebouncedExtra(extra), 150); return () => clearTimeout(t); }, [extra]);
  const [nd, setNd] = useState({ name:"",balance:0,rate:0,minPayment:0 });
  const [view, setView] = useState("unified"); // unified | bills | calendar
  useEffect(() => { var h = (e) => { if(e.detail) setView(e.detail); }; window.addEventListener("debtSetView",h); return () => window.removeEventListener("debtSetView",h); }, []);

  const [nb, setNb] = useState({ name:"",amount:0,sentDate:"",dueDate:"",urgency:1 });
  const [showAddBill, setShowAddBill] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [smartView, setSmartView] = useState("cards");

  // Debt CRUD
  const addDebt = () => { if(!nd.name||!nd.balance) return; setDebts([...debts,{...nd,originalBalance:nd.balance,id:Date.now()}]); setNd({name:"",balance:0,rate:0,minPayment:0}); };
  const rmDebt = id => setDebts(debts.filter(d => d.id!==id));

  // Bill CRUD
  const addBill = () => { if(!nb.name||!nb.amount||!nb.dueDate) return; setBills([...bills,{...nb,id:Date.now(),paid:false}]); setNb({name:"",amount:0,sentDate:"",dueDate:"",urgency:1}); setShowAddBill(false); };
  const rmBill = id => setBills(bills.filter(b => b.id!==id));
  const markPaid = id => setBills(prev => prev.filter(b => b.id!==id));

  // Promote bill to debt
  const promoteToDbt = (bill) => {
    const suggestedMin = Math.max(25, Math.round(bill.amount / 6));
    setDebts([...debts, { name: `${bill.name} (payment plan)`, balance: bill.amount, originalBalance: bill.amount, rate: 0, minPayment: suggestedMin, id: Date.now(), fromBill: true }]);
    setBills(bills.filter(b => b.id !== bill.id));
  };

  // Computed
  const td = debts.reduce((s,d) => s+d.balance, 0);
  const to = Math.max(totalOrigDebt, debts.reduce((s,d) => s+(d.originalBalance||d.balance), 0));
  const tm = debts.reduce((s,d) => s+d.minPayment, 0);
  const po = to>0?((to-td)/to)*100:0;

  const unpaidBills = bills;
  const overdueBills = unpaidBills.filter(b => daysUntil(b.dueDate)<0);
  const urgentBills = unpaidBills.filter(b => { const d=daysUntil(b.dueDate); return d>=0&&d<=7; });
  const totalUnpaid = unpaidBills.reduce((s,b) => s+b.amount, 0);

  // Bills that should be promoted to debt (overdue 30+ days OR urgency >= 3 AND amount > $200)
  const promotionCandidates = useMemo(() => {
    return unpaidBills.filter(b => {
      const daysOver = -daysUntil(b.dueDate);
      const isLongOverdue = daysOver >= 30;
      const isHighUrgency = b.urgency >= 3;
      const isSignificantAmount = b.amount >= 200;
      return (isLongOverdue && isSignificantAmount) || (isHighUrgency && isSignificantAmount) || (isLongOverdue && b.urgency >= 2);
    }).filter(b => !b.promotedToDebt);
  }, [unpaidBills]);

  // Sorted bills
  const sortedBills = useMemo(() => {
    const unpd = [...bills];
    // All bills are unpaid (paid ones are removed)
    unpd.sort((a,b) => { if(b.urgency!==a.urgency) return b.urgency-a.urgency; return daysUntil(a.dueDate)-daysUntil(b.dueDate); });
    return unpd;
  }, [bills]);

  // ═══ SMART ANALYSIS ENGINE ═══
  const smartAnalysis = useMemo(() => {
    if(!debts.length && !unpaidBills.length) return null;

    const highInt = debts.filter(d => d.rate>15);
    const smallDebts = debts.filter(d => d.balance<1000 && d.balance>0);
    const hasQuickWins = smallDebts.length>=1;
    const rateSpread = debts.length>1 ? Math.max(...debts.map(d=>d.rate))-Math.min(...debts.map(d=>d.rate)) : 0;
    const hasUrgent = overdueBills.length>0 || urgentBills.length>0;
    const canAffordExtra = extra > 0;

    // Calculate all strategy results with current extra payment
    const calcPayoff = (strat, extraAmt) => {
      if(!debts.length) return {months:0,interest:0,order:[]};
      let bals = debts.map(d => ({...d,rem:d.balance}));
      let month=0, ti=0; const orderPaidOff = [];
      while(bals.some(d => d.rem>0.01)&&month<600) {
        month++; let ex=extraAmt;
        let sorted;
        if(strat==="avalanche") sorted=[...bals].sort((a,b) => b.rate-a.rate);
        else if(strat==="snowball") sorted=[...bals].sort((a,b) => a.rem-b.rem);
        else if(strat==="focus") { const focus=bals.reduce((best,d) => (!best||d.rate*d.rem>best.rate*best.rem)&&d.rem>0?d:best, null); sorted=focus?[focus,...bals.filter(d=>d.id!==focus.id)]:bals; }
        else sorted=[...bals].sort((a,b) => { if(a.rem<1000&&b.rem>=1000) return -1; if(a.rem>=1000&&b.rem<1000) return 1; return b.rate-a.rate; });
        let mi=0;
        bals.forEach(d => { if(d.rem<=0) return; const int=(d.rem*(d.rate/100))/12; mi+=int; d.rem+=int; const p=Math.min(d.rem,d.minPayment); d.rem-=p; });
        for(const d of sorted) { if(d.rem<=0||ex<=0) continue; const p=Math.min(d.rem,ex); d.rem-=p; ex-=p; }
        ti+=mi;
        bals.forEach(d => { if(d.rem<=0.01 && d.rem>=0 && !orderPaidOff.find(o=>o.id===d.id)) orderPaidOff.push({...d,paidMonth:month}); });
      }
      return {months:month,interest:ti,order:orderPaidOff};
    };

    const avalanche = calcPayoff("avalanche", extra);
    const snowball = calcPayoff("snowball", extra);
    const hybrid = calcPayoff("hybrid", extra);
    const focus = calcPayoff("focus", extra);

    // Also show what happens with different extra payment levels
    const extraScenarios = [0, 100, 200, 500, 1000].filter(e => e !== extra).slice(0,3);
    const scenarioResults = extraScenarios.map(e => ({ extra:e, ...calcPayoff("avalanche", e) }));

    // Determine the best strategy
    const results = [
      { key:"avalanche", ...avalanche },
      { key:"snowball", ...snowball },
      { key:"hybrid", ...hybrid },
      { key:"focus", ...focus },
    ].filter(r => r.months<600);

    const best = results.reduce((b,r) => (!b||r.interest<b.interest)?r:b, null);
    const fastest = results.reduce((b,r) => (!b||r.months<b.months)?r:b, null);

    let recommendation = best?.key || "avalanche";
    let reasoning = [];

    // Factor in bills urgency
    if(hasUrgent) {
      reasoning.push({ type:"warning", text:`You have ${overdueBills.length} overdue and ${urgentBills.length} due-soon bill(s). Address these before extra debt payments.` });
    }

    // Factor in extra payments
    if(canAffordExtra) {
      const noExtra = calcPayoff("avalanche", 0);
      const withExtra = avalanche;
      const monthsSaved = noExtra.months - withExtra.months;
      const interestSaved = noExtra.interest - withExtra.interest;
      if(monthsSaved > 0) {
        reasoning.push({ type:"insight", text:`Your ${formatCurrency(extra)}/mo extra payment saves ${formatCurrency(interestSaved)} in interest and ${monthsSaved} months.` });
      }
    }

    // Check if focusing entirely on one debt makes sense
    if(debts.length > 1 && highInt.length === 1 && highInt[0].balance < extra * 3) {
      recommendation = "focus";
      reasoning.push({ type:"action", text:`Focus all extra on "${highInt[0].name}" (${highInt[0].rate}% APR, ${formatCurrency(highInt[0].balance)}). You could clear it in ~${Math.ceil(highInt[0].balance / (extra + highInt[0].minPayment))} months, then redirect everything to the next debt.` });
    } else if(rateSpread < 3 && hasQuickWins) {
      recommendation = "snowball";
      reasoning.push({ type:"insight", text:`Interest rates are close (${rateSpread.toFixed(1)}% spread) — snowball's motivation wins outweigh the small interest cost.` });
      if(smallDebts.length > 0) reasoning.push({ type:"action", text:`Quick win: "${smallDebts.sort((a,b)=>a.balance-b.balance)[0].name}" (${formatCurrency(smallDebts[0].balance)}) could be paid off in ~${Math.ceil(smallDebts[0].balance/(extra+smallDebts[0].minPayment))} months.` });
    } else if(highInt.length > 0 && hasQuickWins && debts.length >= 3) {
      recommendation = "hybrid";
      reasoning.push({ type:"insight", text:`Mix of high-interest (${highInt.length}) and quick-win debts (${smallDebts.length}) — hybrid gives you wins AND saves on interest.` });
    } else if(highInt.length > 0) {
      recommendation = "avalanche";
      reasoning.push({ type:"insight", text:`High-interest debt at ${Math.max(...debts.map(d=>d.rate))}% APR — avalanche is clearly optimal, saving ${formatCurrency(snowball.interest - avalanche.interest)} vs snowball.` });
    }

    // Extra payment optimization
    if(extra > 0 && debts.length > 0) {
      const focusTarget = recommendation === "avalanche" ? debts.reduce((b,d) => (!b||d.rate>b.rate)?d:b, null)
        : recommendation === "snowball" ? debts.reduce((b,d) => (!b||d.balance<b.balance)?d:b, null)
        : debts.reduce((b,d) => (!b||(d.balance<1000?-1:d.rate)>(b.balance<1000?-1:b.rate))?d:b, null);
      if(focusTarget) {
        const totalPayment = extra + focusTarget.minPayment;
        const monthsToKill = Math.ceil(focusTarget.balance / totalPayment);
        reasoning.push({ type:"action", text:`With ${formatCurrency(extra)}/mo extra → "${focusTarget.name}" cleared in ~${monthsToKill} months. Then redirect ${formatCurrency(totalPayment)}/mo to the next target.` });
      }
    }

    // Promotion suggestions for bills
    const promoSuggestions = promotionCandidates.map(b => {
      const daysOver = -daysUntil(b.dueDate);
      return { ...b, daysOver, suggestedMin: Math.max(25, Math.round(b.amount/6)),
        reason: daysOver >= 60 ? `${daysOver} days overdue — risk of collections/credit damage. Set up a payment plan.`
          : b.urgency >= 4 ? `Final notice/collections — negotiate a payment plan immediately.`
          : `${daysOver} days overdue with ${getUL(b.urgency).label}. Consider converting to a structured payment plan.`
      };
    });

    return { recommendation, reasoning, avalanche, snowball, hybrid, focus, best, fastest, scenarioResults, promoSuggestions };
  }, [debts, debouncedExtra, overdueBills.length, urgentBills.length, unpaidBills, promotionCandidates]);

  // Main payoff calc
  const result = useMemo(() => {
    if(!debts.length) return {months:0,totalInterest:0,schedule:[]};
    const effectiveStrategy = strategy==="smart" ? (smartAnalysis?.recommendation||"avalanche") : strategy;
    let bals=debts.map(d=>({...d,rem:d.balance})), month=0,ti=0; const sch=[];
    while(bals.some(d=>d.rem>0.01)&&month<600) {
      month++; let ex=extra;
      let sorted;
      if(effectiveStrategy==="avalanche") sorted=[...bals].sort((a,b)=>b.rate-a.rate);
      else if(effectiveStrategy==="snowball") sorted=[...bals].sort((a,b)=>a.rem-b.rem);
      else if(effectiveStrategy==="focus") { const f=bals.reduce((b,d)=>(!b||d.rate*d.rem>b.rate*b.rem)&&d.rem>0?d:b,null); sorted=f?[f,...bals.filter(d=>d.id!==f.id)]:bals; }
      else sorted=[...bals].sort((a,b)=>{if(a.rem<1000&&b.rem>=1000)return -1;if(a.rem>=1000&&b.rem<1000)return 1;return b.rate-a.rate;});
      let mi=0;
      bals.forEach(d=>{if(d.rem<=0)return;const int=(d.rem*(d.rate/100))/12;mi+=int;d.rem+=int;const p=Math.min(d.rem,d.minPayment);d.rem-=p;});
      for(const d of sorted){if(d.rem<=0||ex<=0)continue;const p=Math.min(d.rem,ex);d.rem-=p;ex-=p;}
      ti+=mi;sch.push({month,tr:bals.reduce((s,d)=>s+Math.max(0,d.rem),0)});
    }
    return {months:month,totalInterest:ti,schedule:sch};
  }, [debts,strategy,debouncedExtra,smartAnalysis]);

  const dm = po>=100?{icon:"🚀",text:"DEBT FREE!",color:"#fbbf24"}:po>=75?{icon:"🔥",text:"75% demolished!",color:"#f87171"}:po>=50?{icon:"⚡",text:"Over half gone!",color:"#f87171"}:po>=25?{icon:"💪",text:"25% paid off!",color:"#f87171"}:po>0?{icon:"🌱",text:"Paying down debt!",color:"#f87171"}:null;

  const strats = [
    {key:"smart",label:"Smart",desc:"AI-recommended",icon:"🧠"},
    {key:"avalanche",label:"Avalanche",desc:"Highest interest",icon:"⚡"},
    {key:"snowball",label:"Snowball",desc:"Smallest first",icon:"☃"},
    {key:"hybrid",label:"Hybrid",desc:"Quick wins + interest",icon:"⚙"},
  ];

  // Calendar event generation
  const generateCalendarEvents = useCallback(() => {
    const events = [];
    // Debt minimum payments (monthly, 1st of each month)
    debts.forEach(d => {
      if(d.balance > 0) events.push({ title:`💰 ${d.name} — ${formatCurrency(d.minPayment)} min payment`, date: "1st of each month", amount: d.minPayment, type:"debt" });
    });
    // Bill due dates
    unpaidBills.forEach(b => {
      events.push({ title:`⚠ ${b.name} — ${formatCurrency(b.amount)} due`, date: b.dueDate, amount: b.amount, type:"bill", urgent: b.urgency >= 3 });
    });
    return events.sort((a,b) => { if(a.date==="1st of each month") return 1; if(b.date==="1st of each month") return -1; return new Date(a.date)-new Date(b.date); });
  }, [debts, unpaidBills]);

  const calendarEvents = useMemo(() => generateCalendarEvents(), [generateCalendarEvents]);

  return (<div>
    {/* Tab bar */}
    <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
      {[{key:"unified",label:"Debt Strategy",icon:"◆",badge:null},
        {key:"bills",label:"Bills & Fines",icon:"◈",badge:unpaidBills.length>0?unpaidBills.length:null,alert:overdueBills.length>0},
        {key:"calendar",label:"Calendar Sync",icon:"◇",badge:null}
      ].map(st => (
        <button key={st.key} onClick={() => setView(st.key)} style={{ padding:"10px 18px",borderRadius:10,border:view===st.key?"1px solid #fbbf24":"1px solid rgba(255,255,255,0.08)",background:view===st.key?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.02)",color:view===st.key?"#fbbf24":"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6 }}>
          <span>{st.icon}</span>{st.label}
          {st.badge&&<span style={{ background:st.alert?"#ef4444":"rgba(251,191,36,0.3)",color:st.alert?"#fff":"#fbbf24",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 7px" }}>{st.badge}</span>}
        </button>
      ))}
    </div>

    {/* ═══ PROMOTION ALERTS (only on bills view to avoid duplicate noise) ═══ */}
    {view==="bills" && smartAnalysis?.promoSuggestions?.length > 0 && (
      <div style={{ marginBottom:16 }}>
        {smartAnalysis.promoSuggestions.map(b => (
          <div key={b.id} style={{ padding:14,marginBottom:8,borderRadius:12,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:"rgba(239,68,68,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>🚨</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#f87171" }}>{b.name} — {formatCurrency(b.amount)}</div>
              <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5,marginTop:2 }}>{b.reason}</div>
            </div>
            <button onClick={() => promoteToDbt(b)} style={{ padding:"8px 14px",borderRadius:8,background:"linear-gradient(135deg,#f87171,#ef4444)",border:"none",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" }}>
              Convert to Payment Plan →
            </button>
          </div>
        ))}
      </div>
    )}

    {/* ═══ VIEW: DEBT STRATEGY ═══ */}
    {view==="unified" && (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <div>
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Add Debt</div>
          <Field label="Debt Name" value={nd.name} onChange={v=>setNd({...nd,name:v})} type="text" placeholder="e.g. Credit Card" />
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}><Field label="Balance" value={nd.balance||""} onChange={v=>setNd({...nd,balance:v})} prefix="$" /><Field label="APR %" value={nd.rate||""} onChange={v=>setNd({...nd,rate:v})} /></div>
          <Field label="Min Payment" value={nd.minPayment||""} onChange={v=>setNd({...nd,minPayment:v})} prefix="$" />
          <Btn onClick={addDebt} style={{ width:"100%" }}>+ Add Debt</Btn>
        </Card>
        <Card>
          <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:12 }}>Debts ({debts.length})</div>
          {!debts.length&&<div style={{ textAlign:"center",padding:24 }}>
            <div style={{ fontSize:48,marginBottom:8 }}>🎉</div>
            <div style={{ fontSize:18,fontWeight:800,color:"#6ee7b7",marginBottom:4 }}>You're Debt Free!</div>
            <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.6 }}>Incredible achievement! You have zero debt. Redirect your former payments into investments and watch your wealth grow.</div>
          </div>}
          {[...debts].sort((a,b) => strategy==="avalanche"?b.rate-a.rate:strategy==="snowball"?a.balance-b.balance:strategy==="highest"?b.balance-a.balance:0).map((d,idx) => { const paid=d.originalBalance-d.balance; const paidPct=d.originalBalance>0?(paid/d.originalBalance)*100:0; return (<div key={d.id} style={{ padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display:"flex",alignItems:"center" }}>
              <div style={{ width:20,height:20,borderRadius:10,background:idx===0?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:idx===0?"#fbbf24":"#475569",fontWeight:700,marginRight:8,flexShrink:0 }}>{idx+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0",display:"flex",alignItems:"center",gap:6 }}>{d.name}{d.fromBill&&<span style={{ fontSize:9,color:"#fb923c",background:"rgba(251,147,60,0.1)",padding:"2px 6px",borderRadius:4,fontWeight:600 }}>from bill</span>}{idx===0&&<span style={{ fontSize:8,color:"#fbbf24",background:"rgba(251,191,36,0.1)",padding:"1px 5px",borderRadius:4,fontWeight:600 }}>PRIORITY</span>}</div>
                <div style={{ fontSize:11,color:"#64748b" }}>{d.rate}% APR · Min {formatCurrency(d.minPayment)}/mo</div>
              </div>
              <div style={{ textAlign:"right",marginRight:12 }}>
                <div style={{ fontSize:14,fontWeight:700,color:"#f87171" }}>{formatCurrency(d.balance)}</div>
                <div style={{ fontSize:9,color:"#6ee7b7" }}>{formatCurrency(paid)} paid</div>
              </div>
              <button onClick={()=>rmDebt(d.id)} style={{ background:"rgba(248,113,113,0.1)",border:"none",borderRadius:6,color:"#f87171",cursor:"pointer",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>×</button>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:6 }}>
              <MiniBar value={paid} max={d.originalBalance} color="#6ee7b7" height={5} />
              <span style={{ fontSize:9,color:"#6ee7b7",fontWeight:600,flexShrink:0 }}>{paidPct.toFixed(0)}%</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:4 }}>
              <span style={{ fontSize:9,color:"#64748b" }}>Paid:</span>
              <input type="number" value={paid||""} onChange={e=>{const v=Math.max(0,Math.min(d.originalBalance,Number(e.target.value)||0));setDebts(debts.map(x=>x.id===d.id?{...x,balance:x.originalBalance-v}:x))}} style={{ width:80,padding:"3px 6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:4,color:"#e2e8f0",fontSize:10,fontFamily:"'DM Sans',sans-serif",outline:"none" }} />
              <span style={{ fontSize:9,color:"#64748b" }}>of {formatCurrency(d.originalBalance)}</span>
            </div>
          </div>); })}
          {dm&&debts.length>0&&<div style={{ marginTop:12,padding:12,background:`${dm.color}08`,borderRadius:10,border:`1px solid ${dm.color}20`,display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:20 }}>{dm.icon}</span><span style={{ fontSize:12,color:dm.color,fontWeight:600 }}>{dm.text}</span></div>}
        </Card>
      </div>
      <div>
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:12 }}>Strategy</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16 }}>
            {strats.map(s => (<button key={s.key} onClick={()=>setStrategy(s.key)} style={{ padding:"10px 6px",borderRadius:10,border:strategy===s.key?"1px solid #fbbf24":"1px solid rgba(255,255,255,0.08)",background:strategy===s.key?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.03)",color:strategy===s.key?"#fbbf24":"#94a3b8",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center" }}>
              <div style={{ fontSize:15 }}>{s.icon}</div><div style={{ fontSize:10,fontWeight:700,marginTop:2 }}>{s.label}</div>
            </button>))}
          </div>

          {/* Smart panel */}
          {strategy==="smart"&&smartAnalysis&&(
            <div style={{ marginBottom:14,padding:14,background:"rgba(167,139,250,0.05)",borderRadius:12,border:"1px solid rgba(167,139,250,0.12)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#a78bfa",display:"flex",alignItems:"center",gap:6 }}>🧠 Smart Analysis</div>
                <div style={{ display:"flex",gap:4 }}>
                  <button onClick={() => setSmartView(smartView==="cards"?"compact":"cards")} style={{ background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#64748b",fontSize:9,padding:"3px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{smartView==="cards"?"Compact":"Visual"}</button>
                  <span style={{ fontSize:10,color:"#fbbf24",background:"rgba(251,191,36,0.1)",padding:"3px 10px",borderRadius:6,fontWeight:600,textTransform:"capitalize" }}>{smartAnalysis.recommendation}</span>
                </div>
              </div>
              {smartView==="cards" && !cleanMode ? smartAnalysis.reasoning.map((r,i) => (
                <div key={i} style={{ padding:10,marginBottom:6,borderRadius:10,background:r.type==="warning"?"rgba(251,191,36,0.06)":r.type==="action"?"rgba(110,231,183,0.06)":"rgba(167,139,250,0.04)",border:`1px solid ${r.type==="warning"?"rgba(251,191,36,0.12)":r.type==="action"?"rgba(110,231,183,0.12)":"rgba(167,139,250,0.08)"}`,display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:26,height:26,borderRadius:7,background:r.type==="warning"?"rgba(251,191,36,0.12)":r.type==="action"?"rgba(110,231,183,0.12)":"rgba(167,139,250,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0 }}>{r.type==="warning"?"⚠":r.type==="action"?"→":"💡"}</div>
                  <div style={{ fontSize:11,color:"#e2e8f0",lineHeight:1.5 }}>{r.text}</div>
                </div>
              )) : !cleanMode ? smartAnalysis.reasoning.map((r,i) => (
                <div key={i} style={{ fontSize:10,color:"#94a3b8",marginBottom:3,paddingLeft:8,borderLeft:"2px solid rgba(167,139,250,0.15)" }}>{r.text}</div>
              )) : null}
              {/* Strategy comparison */}
              <div style={{ marginTop:10,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
                {[{l:"Avalanche",k:"avalanche",r:smartAnalysis.avalanche,ic:"⚡"},{l:"Snowball",k:"snowball",r:smartAnalysis.snowball,ic:"☃"},{l:"Hybrid",k:"hybrid",r:smartAnalysis.hybrid,ic:"⚙"},{l:"Focus",k:"focus",r:smartAnalysis.focus,ic:"🎯"}].map(x => {
                  const isR = smartAnalysis.recommendation===x.k;
                  return (<div key={x.k} style={{ padding:10,borderRadius:10,background:isR?"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,191,36,0.03))":"rgba(255,255,255,0.02)",border:isR?"1px solid rgba(251,191,36,0.2)":"1px solid rgba(255,255,255,0.06)",textAlign:"center" }}>
                    <div style={{ fontSize:15,marginBottom:2 }}>{x.ic}</div>
                    <div style={{ fontSize:9,color:isR?"#fbbf24":"#94a3b8",fontWeight:700 }}>{x.l}</div>
                    <div style={{ fontSize:13,fontWeight:800,color:"#e2e8f0",marginTop:2 }}>{x.r.months<600?`${Math.floor(x.r.months/12)}y ${x.r.months%12}m`:"—"}</div>
                    <div style={{ fontSize:9,color:"#475569" }}>{formatCurrency(x.r.interest)}</div>
                    {isR&&<div style={{ fontSize:8,color:"#fbbf24",marginTop:3,fontWeight:700 }}>★ BEST</div>}
                  </div>);
                })}
              </div>
              {/* Extra payment scenarios */}
              {smartAnalysis.scenarioResults.length>0&&debts.length>0&&(
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:10,color:"#64748b",marginBottom:4 }}>What if you changed your extra payment?</div>
                  <div style={{ display:"flex",gap:6 }}>
                    {smartAnalysis.scenarioResults.map(sc => (
                      <div key={sc.extra} onClick={() => setExtra(sc.extra)} style={{ flex:1,padding:6,borderRadius:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",cursor:"pointer",textAlign:"center" }}>
                        <div style={{ fontSize:10,color:"#fbbf24",fontWeight:600 }}>{formatCurrency(sc.extra)}/mo</div>
                        <div style={{ fontSize:11,fontWeight:700,color:"#e2e8f0" }}>{sc.months<600?`${Math.floor(sc.months/12)}y${sc.months%12}m`:"—"}</div>
                        <div style={{ fontSize:9,color:"#475569" }}>{formatCurrency(sc.interest)} int</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Slider label="Extra Monthly Payment" value={extra} onChange={setExtra} min={0} max={2000} color="#fbbf24" suffix="" />
          <div style={{ textAlign:"center",fontSize:18,fontWeight:700,color:"#fbbf24",marginBottom:2 }}>{formatCurrency(extra)}/mo extra</div>
          <div style={{ fontSize:11,color:"#475569",textAlign:"center",marginBottom:12 }}>Total: {formatCurrency(tm+extra)}/mo</div>
        </Card>
        <Card>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14 }}>
            <div style={{ padding:12,background:"rgba(255,255,255,0.03)",borderRadius:10,textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>Total Debt</div><div style={{ fontSize:16,fontWeight:700,color:"#f87171" }}>{formatCurrency(td)}</div></div>
            <div style={{ padding:12,background:"rgba(255,255,255,0.03)",borderRadius:10,textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>Payoff</div><div style={{ fontSize:16,fontWeight:700,color:"#fbbf24" }}>{result.months<600?`${Math.floor(result.months/12)}y ${result.months%12}m`:"—"}</div></div>
            <div style={{ padding:12,background:"rgba(255,255,255,0.03)",borderRadius:10,textAlign:"center" }}><div style={{ fontSize:10,color:"#64748b",marginBottom:2 }}>Interest</div><div style={{ fontSize:16,fontWeight:700,color:"#a78bfa" }}>{formatCurrency(result.totalInterest)}</div></div>
          </div>
          {/* ═══ GAMIFICATION PROGRESS BAR ═══ */}
          {debts.length>0&&(<div style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <span style={{ fontSize:11,fontWeight:600,color:"#94a3b8" }}>Debt Freedom Progress</span>
              <button onClick={()=>setShowProgressBar(!showProgressBar)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:"#94a3b8",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:"3px 10px" }}>{showProgressBar?"▲ Hide":"▼ Show"}</button>
            </div>
            {showProgressBar&&(<div>
              {/* Main progress track */}
              <div style={{ position:"relative",height:32,borderRadius:16,background:"rgba(255,255,255,0.04)",overflow:"hidden",marginBottom:8 }}>
                {/* Gradient fill */}
                <div style={{ position:"absolute",top:0,left:0,height:"100%",width:`${Math.min(po,100)}%`,borderRadius:16,background:po>=100?"linear-gradient(90deg,#6ee7b7,#34d399,#fbbf24)":po>=50?"linear-gradient(90deg,#fbbf24,#fb923c,#6ee7b7)":"linear-gradient(90deg,#f87171,#fbbf24)",transition:"width 0.8s cubic-bezier(.4,0,.2,1)",boxShadow:po>5?`0 0 20px ${po>=75?"rgba(110,231,183,0.3)":po>=50?"rgba(251,191,36,0.3)":"rgba(248,113,113,0.2)"}`:undefined }} />
                {/* Milestone markers */}
                {[25,50,75].map(m => (<div key={m} style={{ position:"absolute",left:`${m}%`,top:0,height:"100%",width:1,background:"rgba(255,255,255,0.1)" }} />))}
                {/* Percentage text */}
                <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,0.5)",letterSpacing:0.5 }}>
                  {po.toFixed(1)}% paid off
                </div>
              </div>
              {/* Milestone badges */}
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                {[{pct:0,icon:"🏁",label:"Start"},{pct:25,icon:"💪",label:"25%"},{pct:50,icon:"⚡",label:"Halfway"},{pct:75,icon:"🔥",label:"75%"},{pct:100,icon:"🚀",label:"Free!"}].map(ms => {
                  const reached = po >= ms.pct;
                  return (<div key={ms.pct} style={{ textAlign:"center",opacity:reached?1:0.35,transition:"opacity 0.3s" }}>
                    <div style={{ fontSize:reached?16:13,transition:"font-size 0.3s" }}>{ms.icon}</div>
                    <div style={{ fontSize:9,color:reached?"#e2e8f0":"#475569",fontWeight:reached?600:400,marginTop:2 }}>{ms.label}</div>
                  </div>);
                })}
              </div>
              {/* Encouragement message */}
              {po>0&&po<100&&(<div style={{ marginTop:8,textAlign:"center",fontSize:11,color:po>=75?"#6ee7b7":po>=50?"#fbbf24":"#fb923c",fontWeight:500 }}>
                {po>=75?"Almost there! The finish line is so close.":po>=50?"Over halfway! Your discipline is paying off.":po>=25?"Great momentum! Keep crushing it.":"Every payment brings you closer to freedom."}
              </div>)}
            </div>)}
          </div>)}
          {result.schedule.length>0&&!cleanMode&&(<div><div style={{ fontSize:11,fontWeight:600,color:"#94a3b8",marginBottom:6 }}>Projection</div><div style={{ display:"flex",alignItems:"flex-end",gap:1,height:70 }}>{result.schedule.filter((_,i)=>i%Math.max(1,Math.floor(result.schedule.length/60))===0).map((s,i)=>(<div key={i} style={{ flex:1,height:`${(s.tr/(td||1))*100}%`,background:"linear-gradient(to top,rgba(251,191,36,0.3),rgba(248,113,113,0.3))",borderRadius:"2px 2px 0 0",minWidth:2 }} />))}</div><div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#475569",marginTop:4 }}><span>Now</span><span>Debt Free!</span></div></div>)}
        </Card>
      </div>
    </div>
    )}

    {/* ═══ VIEW: BILLS & FINES ═══ */}
    {view==="bills" && (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <div>
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showAddBill?16:0 }}>
            <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>Add Fine / Bill</div>
            <button onClick={()=>setShowAddBill(!showAddBill)} style={{ background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"#94a3b8",padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{showAddBill?"Close":"+ New"}</button>
          </div>
          {showAddBill&&(<div>
            <Field label="Description" value={nb.name} onChange={v=>setNb({...nb,name:v})} type="text" placeholder="e.g. Parking fine" />
            <Field label="Amount" value={nb.amount||""} onChange={v=>setNb({...nb,amount:v})} prefix="$" />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}><Field label="Sent Date" value={nb.sentDate} onChange={v=>setNb({...nb,sentDate:v})} type="date" /><Field label="Due Date" value={nb.dueDate} onChange={v=>setNb({...nb,dueDate:v})} type="date" /></div>
            <div style={{ marginBottom:14 }}><label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:6 }}>Notice Level</label>
              <div style={{ display:"flex",gap:3 }}>{URGENCY_LEVELS.map(u => (<button key={u.value} onClick={()=>setNb({...nb,urgency:u.value})} style={{ flex:1,padding:"7px 2px",borderRadius:6,border:nb.urgency===u.value?`1px solid ${u.color}`:"1px solid rgba(255,255,255,0.06)",background:nb.urgency===u.value?u.bg:"transparent",color:nb.urgency===u.value?u.color:"#475569",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center" }}>{u.label}</button>))}</div>
            </div>
            <Btn onClick={addBill} style={{ width:"100%" }}>+ Add Bill</Btn>
          </div>)}
        </Card>
        <Card>
          <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:12 }}>Summary</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            <div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8 }}><div style={{ fontSize:10,color:"#64748b" }}>Unpaid</div><div style={{ fontSize:16,fontWeight:700,color:"#f87171" }}>{formatCurrency(totalUnpaid)}</div></div>
            <div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8 }}><div style={{ fontSize:10,color:"#64748b" }}>Pending</div><div style={{ fontSize:16,fontWeight:700,color:"#fbbf24" }}>{unpaidBills.length}</div></div>
            <div style={{ padding:10,background:overdueBills.length?"rgba(239,68,68,0.06)":"rgba(255,255,255,0.03)",borderRadius:8 }}><div style={{ fontSize:10,color:overdueBills.length?"#ef4444":"#64748b" }}>Overdue</div><div style={{ fontSize:16,fontWeight:700,color:overdueBills.length?"#ef4444":"#e2e8f0" }}>{overdueBills.length}</div></div>
            <div style={{ padding:10,background:urgentBills.length?"rgba(251,191,36,0.06)":"rgba(255,255,255,0.03)",borderRadius:8 }}><div style={{ fontSize:10,color:urgentBills.length?"#fbbf24":"#64748b" }}>Due 7 days</div><div style={{ fontSize:16,fontWeight:700,color:urgentBills.length?"#fbbf24":"#e2e8f0" }}>{urgentBills.length}</div></div>
          </div>
        </Card>
      </div>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>Priority Queue</div>
        {(()=>{
          const totalFines = bills.reduce((s,b) => s+b.amount, 0);
          const origFines = Math.max(totalFines, 1460);
          const paidPct = origFines > 0 ? Math.max(0, Math.min(100, ((origFines - totalFines) / origFines) * 100)) : 0;
          const msg = paidPct >= 100 ? {t:"All bills cleared! You're free!",c:"#6ee7b7",i:"🎉"} : paidPct >= 75 ? {t:"Almost there — just a little more to go!",c:"#6ee7b7",i:"💪"} : paidPct >= 50 ? {t:"Halfway done — keep that momentum!",c:"#34d399",i:"⚡"} : paidPct >= 25 ? {t:"Good start! Every payment counts.",c:"#fbbf24",i:"📈"} : paidPct > 0 ? {t:"You've begun! One bill at a time.",c:"#38bdf8",i:"🌱"} : {t:"Let's tackle these bills together.",c:"#94a3b8",i:"📋"};
          return (<div style={{ marginBottom:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4 }}><span style={{ color:"#94a3b8" }}>Bills Cleared</span><span style={{ color:"#6ee7b7",fontWeight:600 }}>{paidPct.toFixed(0)}%</span></div>
            <MiniBar value={paidPct} max={100} color="#6ee7b7" height={6} />
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#475569",marginTop:3 }}><span>{formatCurrency(origFines - totalFines)} paid</span><span>{formatCurrency(totalFines)} remaining</span></div>
            <div style={{ marginTop:6,padding:"6px 10px",background:`${msg.c}08`,borderRadius:6,border:`1px solid ${msg.c}15`,display:"flex",alignItems:"center",gap:6 }}><span style={{ fontSize:12 }}>{msg.i}</span><span style={{ fontSize:10,color:msg.c,fontWeight:500 }}>{msg.t}</span></div>
          </div>);
        })()}
        <div style={{ fontSize:11,color:"#475569",marginBottom:12 }}>Sorted by urgency → due date — pay top to bottom</div>
        <div style={{ maxHeight:480,overflowY:"auto" }}>
          {!sortedBills.length&&<div style={{ textAlign:"center",padding:40,color:"#475569",fontSize:13 }}>No bills. Nice!</div>}
          {sortedBills.map((b,idx) => {
            const ul=getUL(b.urgency); const days=daysUntil(b.dueDate); const od=days<0; const ds=days>=0&&days<=7;
            const isPromoCandidate = promotionCandidates.find(p => p.id===b.id);
            return (<div key={b.id} style={{ padding:12,marginBottom:6,borderRadius:10,background:od?"rgba(239,68,68,0.05)":ds?"rgba(251,191,36,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${od?"rgba(239,68,68,0.12)":ds?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.04)"}`,opacity:1 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:20,height:20,borderRadius:6,background:od?"#ef4444":ds?"#fbbf24":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:od||ds?"#0f172a":"#64748b",flexShrink:0 }}>{idx+1}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"#e2e8f0",textDecoration:"none" }}>{b.name}</div>
                  <div style={{ fontSize:10,color:"#64748b",display:"flex",gap:6,flexWrap:"wrap" }}>
                    {b.dueDate&&<span>{fmtDate(b.dueDate)}</span>}
                    {b.dueDate&&<span style={{ fontWeight:600,color:od?"#ef4444":ds?"#fbbf24":"#94a3b8" }}>{od?`${Math.abs(days)}d late`:days===0?"Today":`${days}d`}</span>}
                    <span style={{ color:ul.color,fontWeight:600 }}>{ul.label}</span>
                  </div>
                </div>
                <div style={{ fontSize:13,fontWeight:700,color:"#e2e8f0",marginRight:6 }}>{formatCurrency(b.amount)}</div>
                <div style={{ display:"flex",gap:3 }}>
                  <button onClick={()=>markPaid(b.id)} style={{ background:"rgba(110,231,183,0.1)",border:"none",borderRadius:5,color:"#6ee7b7",cursor:"pointer",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>{"✓"}</button>
                  <button onClick={()=>rmBill(b.id)} style={{ background:"rgba(248,113,113,0.1)",border:"none",borderRadius:5,color:"#f87171",cursor:"pointer",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>×</button>
                </div>
              </div>
              {isPromoCandidate&&(
                <div style={{ marginTop:8,padding:8,borderRadius:8,background:"rgba(251,147,60,0.06)",border:"1px solid rgba(251,147,60,0.12)",display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ fontSize:11,color:"#fb923c",flex:1 }}>💡 Consider converting to a payment plan ({formatCurrency(Math.max(25,Math.round(b.amount/6)))}/mo)</span>
                  <button onClick={()=>promoteToDbt(b)} style={{ padding:"4px 10px",borderRadius:6,background:"rgba(251,147,60,0.15)",border:"1px solid rgba(251,147,60,0.25)",color:"#fb923c",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" }}>Convert →</button>
                </div>
              )}
            </div>);
          })}
        </div>
      </Card>
    </div>
    )}

    {/* ═══ VIEW: CALENDAR SYNC ═══ */}
    {view==="calendar" && (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>Google Calendar Sync</div>
        <div style={{ fontSize:11,color:"#475569",marginBottom:20 }}>Get reminders for debt payments and bill due dates directly in your calendar.</div>
        <div style={{ padding:20,background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",textAlign:"center",marginBottom:16 }}>
          <div style={{ fontSize:36,marginBottom:8 }}>📅</div>
          <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>
            {calendarEnabled ? "Calendar Connected" : "Connect Google Calendar"}
          </div>
          <div style={{ fontSize:11,color:"#64748b",marginBottom:16 }}>
            {calendarEnabled ? "Your payment reminders are being synced." : "Automatically add payment due dates and reminders to your Google Calendar."}
          </div>
          <button onClick={() => calendarEnabled ? onToggleCalendar() : (setShowGoogleAuth(true), window.open("https://accounts.google.com/o/oauth2/v2/auth?client_id=demo&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/calendar.events&access_type=offline", "_blank", "width=500,height=600,noopener"))} style={{ padding:"12px 24px",borderRadius:10,background:calendarEnabled?"rgba(248,113,113,0.1)":"linear-gradient(135deg,#6ee7b7,#34d399)",border:calendarEnabled?"1px solid rgba(248,113,113,0.2)":"none",color:calendarEnabled?"#f87171":"#0f172a",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
            {calendarEnabled ? "Disconnect Calendar" : "Connect Google Calendar"}
          </button>
        </div>
        {calendarEnabled && (
          <div>
            <div style={{ fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8 }}>Sync Settings</div>
            {[{label:"Debt minimum payments (monthly)",desc:"Reminder on the 1st of each month",default:true},
              {label:"Bill due dates",desc:"Reminder 3 days before and on due date",default:true},
              {label:"Overdue alerts",desc:"Daily reminder for overdue bills",default:true},
              {label:"Debt-free milestone date",desc:"Celebration event when projected debt-free",default:false}
            ].map((opt,i) => (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width:18,height:18,borderRadius:4,background:opt.default?"#6ee7b7":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#0f172a",fontWeight:700,cursor:"pointer",flexShrink:0 }}>{opt.default?"✓":""}</div>
                <div><div style={{ fontSize:12,color:"#e2e8f0" }}>{opt.label}</div><div style={{ fontSize:10,color:"#475569" }}>{opt.desc}</div></div>
              </div>
            ))}
            <button onClick={onSyncCalendar} style={{ marginTop:12,padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#6ee7b7,#34d399)",border:"none",color:"#0f172a",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%" }}>
              🔄 Sync Now
            </button>
          </div>
        )}
      </Card>
      {showGoogleAuth&&<div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)" }} onClick={() => setShowGoogleAuth(false)}>
        <div style={{ width:420,maxHeight:"80vh",borderRadius:16,background:"#0f172a",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",overflow:"hidden" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}><span style={{ fontSize:20 }}>{"\uD83D\uDCC5"}</span><span style={{ fontSize:14,fontWeight:700,color:"#e2e8f0" }}>Connect Google Calendar</span></div>
            <button onClick={() => setShowGoogleAuth(false)} style={{ background:"none",border:"none",color:"#64748b",fontSize:18,cursor:"pointer",padding:"4px 8px" }}>{"\u00D7"}</button>
          </div>
          <div style={{ padding:20 }}>
            <div style={{ textAlign:"center",padding:"20px 0" }}>
              <div style={{ fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.6 }}>Sign in with your Google account to sync payment reminders and due dates to your calendar.</div>
              <button onClick={() => { window.open("https://accounts.google.com/o/oauth2/v2/auth?client_id=demo&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/calendar.events&access_type=offline", "_blank", "width=500,height=600,noopener"); }} style={{ padding:"12px 28px",borderRadius:10,background:"#fff",border:"none",color:"#1a1a2e",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 2px 8px rgba(0,0,0,0.2)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign in with Google
              </button>
              <div style={{ marginTop:16,fontSize:10,color:"#475569" }}>A Google sign-in window will open. After authorizing, return here.</div>
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:16,marginTop:8 }}>
              <div style={{ fontSize:11,color:"#64748b",marginBottom:8 }}>After signing in:</div>
              <button onClick={() => { onToggleCalendar(); setShowGoogleAuth(false); }} style={{ width:"100%",padding:"10px 20px",borderRadius:10,background:"linear-gradient(135deg,#6ee7b7,#34d399)",border:"none",color:"#0f172a",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>I have signed in - Connect Calendar</button>
              <button onClick={() => setShowGoogleAuth(false)} style={{ width:"100%",marginTop:8,padding:"10px 20px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>}
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>Upcoming Payment Events</div>
        <div style={{ fontSize:11,color:"#475569",marginBottom:16 }}>{calendarEvents.length} events to be synced</div>
        <div style={{ maxHeight:460,overflowY:"auto" }}>
          {calendarEvents.map((ev,i) => (
            <div key={i} style={{ padding:12,marginBottom:6,borderRadius:10,background:ev.type==="bill"?"rgba(251,191,36,0.04)":"rgba(110,231,183,0.04)",border:`1px solid ${ev.type==="bill"?"rgba(251,191,36,0.08)":"rgba(110,231,183,0.08)"}` }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:32,height:32,borderRadius:8,background:ev.type==="bill"?ev.urgent?"rgba(239,68,68,0.12)":"rgba(251,191,36,0.1)":"rgba(110,231,183,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>{ev.type==="bill"?"⚠":"💰"}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"#e2e8f0" }}>{ev.title}</div>
                  <div style={{ fontSize:10,color:"#64748b" }}>{ev.date==="1st of each month"?"📆 Recurring monthly":fmtDate(ev.date)}</div>
                </div>
                <div style={{ fontSize:12,fontWeight:700,color:ev.type==="bill"?"#fbbf24":"#6ee7b7" }}>{formatCurrency(ev.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
    )}
  </div>);
}
// ═══ SAVINGS & HYSA COMPARISON ═══
function SavingsGoals({ savings, setSavings, income, expenses, emergency, cleanMode }) {
  const [ng, setNg] = useState({ name:"",target:0,saved:0,monthly:0,icon:"🎯" });
  const [hr, setHr] = useState(0); const [rr, setRr] = useState(0);
  const [hd, setHd] = useState(0); const [hm, setHm] = useState(0);
  const [showEF, setShowEF] = useState(false);
  const icons = ["🎯","🏠","✈️","🚗","📚","💍","🎓","💻","🏖️","🎸"];
  const add = () => { if(!ng.name||!ng.target) return; setSavings([...savings,{...ng,id:Date.now()}]); setNg({name:"",target:0,saved:0,monthly:0,icon:"🎯"}); };
  const rm = id => setSavings(savings.filter(g => g.id!==id));

  const hysaProj = useMemo(() => {
    const data=[]; let hB=hd,rB=hd,dep=hd;
    for(let m=1;m<=60;m++) { hB=(hB+hm)*(1+hr/100/12); rB=(rB+hm)*(1+rr/100/12); dep+=hm; if(m%12===0) data.push({year:m/12,hysa:hB,regular:rB,deposited:dep}); }
    return data;
  }, [hd,hm,hr,rr]);
  const fh = hysaProj[hysaProj.length-1];
  const diff = fh ? (fh.hysa-fh.deposited)-(fh.regular-fh.deposited) : 0;

  return (<div>
    {!cleanMode&&<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>High-Yield Savings Comparison</div>
        <div style={{ fontSize:11,color:"#475569",marginBottom:16 }}>See how much more your money earns in a HYSA vs regular savings</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}><Field label="Initial Deposit" value={hd||""} onChange={setHd} prefix="$" /><Field label="Monthly Deposit" value={hm||""} onChange={setHm} prefix="$" /></div>
        <Slider label="HYSA APY" value={hr} onChange={setHr} min={0} max={6} step={0.1} color="#6ee7b7" suffix="%" />
        <Slider label="Regular Savings APY" value={rr} onChange={setRr} min={0} max={2} step={0.1} color="#475569" suffix="%" />
        {/* Emergency fund HYSA toggle */}
        {emergency&&emergency.saved>0&&(()=>{
          const efHysa = emergency.saved * Math.pow(1 + hr/100/12, 60);
          const efReg = emergency.saved * Math.pow(1 + rr/100/12, 60);
          const efDiff = efHysa - efReg;
          return (<div style={{ marginTop:8 }}>
            <button onClick={() => setShowEF(!showEF)} style={{ width:"100%",padding:"10px 14px",borderRadius:10,background:showEF?"rgba(110,231,183,0.1)":"linear-gradient(135deg,rgba(110,231,183,0.06),rgba(110,231,183,0.02))",border:"1px solid rgba(110,231,183,0.15)",color:"#e2e8f0",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <span>🛡️ What if my emergency fund was in a HYSA?</span>
              <span style={{ fontSize:10,color:"#6ee7b7",fontWeight:700 }}>See impact →</span>
            </button>
            {showEF&&(<div style={{ marginTop:8,padding:12,background:"rgba(110,231,183,0.04)",borderRadius:10,border:"1px solid rgba(110,231,183,0.1)" }}>
              <div style={{ fontSize:11,color:"#94a3b8",marginBottom:6 }}>Your {formatCurrency(emergency.saved)} emergency fund over 5 years:</div>
              <div style={{ display:"flex",gap:12,marginBottom:6 }}>
                <div style={{ flex:1,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Regular</div><div style={{ fontSize:14,fontWeight:700,color:"#94a3b8" }}>{formatCurrency(efReg)}</div></div>
                <div style={{ flex:1,textAlign:"center" }}><div style={{ fontSize:9,color:"#6ee7b7" }}>HYSA</div><div style={{ fontSize:14,fontWeight:700,color:"#6ee7b7" }}>{formatCurrency(efHysa)}</div></div>
              </div>
              <div style={{ textAlign:"center",fontSize:12,fontWeight:700,color:"#6ee7b7" }}>+{formatCurrencyFull(efDiff)} extra just by switching</div>
              <div style={{ fontSize:9,color:"#475569",textAlign:"center",marginTop:2 }}>Your emergency fund still works the same — it just earns more.</div>
            </div>)}
          </div>);
        })()}
      </Card>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>5-Year Projection</div>
        <div style={{ display:"flex",alignItems:"flex-end",gap:12,height:120,marginBottom:8 }}>
          {hysaProj.map((d,i) => (<div key={i} style={{ flex:1,display:"flex",gap:4,alignItems:"flex-end",height:"100%" }}>
            <div style={{ flex:1,height:`${(d.regular/(fh?.hysa||1))*100}%`,background:"rgba(255,255,255,0.08)",borderRadius:"4px 4px 0 0",minHeight:4,position:"relative" }}>{i===hysaProj.length-1&&<div style={{ position:"absolute",top:-14,width:"100%",textAlign:"center",fontSize:8,color:"#64748b" }}>{formatCurrency(d.regular)}</div>}</div>
            <div style={{ flex:1,height:`${(d.hysa/(fh?.hysa||1))*100}%`,background:"linear-gradient(to top, rgba(110,231,183,0.3), rgba(110,231,183,0.6))",borderRadius:"4px 4px 0 0",minHeight:4,position:"relative" }}>{i===hysaProj.length-1&&<div style={{ position:"absolute",top:-14,width:"100%",textAlign:"center",fontSize:8,color:"#6ee7b7",fontWeight:700 }}>{formatCurrency(d.hysa)}</div>}</div>
          </div>))}
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#475569",marginBottom:16 }}>{hysaProj.map((d,i) => <span key={i}>Year {d.year}</span>)}</div>
        <div style={{ display:"flex",gap:16,marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ width:10,height:10,borderRadius:2,background:"rgba(255,255,255,0.15)" }} /><span style={{ fontSize:11,color:"#64748b" }}>Regular ({rr}%)</span></div>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ width:10,height:10,borderRadius:2,background:"#6ee7b7" }} /><span style={{ fontSize:11,color:"#6ee7b7" }}>HYSA ({hr}%)</span></div>
        </div>
        <div style={{ padding:14,background:"rgba(110,231,183,0.06)",borderRadius:12,border:"1px solid rgba(110,231,183,0.12)" }}>
          <div style={{ fontSize:12,color:"#94a3b8",marginBottom:4 }}>By switching to a HYSA you'd earn an extra:</div>
          <div style={{ fontSize:28,fontWeight:800,color:"#6ee7b7" }}>{formatCurrencyFull(diff)}</div>
          <div style={{ fontSize:11,color:"#475569",marginTop:2 }}>over 5 years · That's {formatCurrencyFull(diff/5)}/year in extra interest</div>
        </div>
      </Card>
    </div>}
    <div style={{ display:"grid",gridTemplateColumns:cleanMode?"1fr":"1fr 1fr",gap:16 }}>
      {!cleanMode&&<Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>New Savings Goal</div>
        <Field label="Goal Name" value={ng.name} onChange={v => setNg({...ng,name:v})} type="text" placeholder="e.g. Vacation fund" />
        <div style={{ marginBottom:12 }}><label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:6 }}>Icon</label><div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{icons.map(ic => (<button key={ic} onClick={() => setNg({...ng,icon:ic})} style={{ width:36,height:36,borderRadius:8,border:ng.icon===ic?"2px solid #38bdf8":"1px solid rgba(255,255,255,0.08)",background:ng.icon===ic?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>{ic}</button>))}</div></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}><Field label="Target Amount" value={ng.target||""} onChange={v => setNg({...ng,target:v})} prefix="$" /><Field label="Already Saved" value={ng.saved||""} onChange={v => setNg({...ng,saved:v})} prefix="$" /></div>
        <Field label="Monthly Contribution" value={ng.monthly||""} onChange={v => setNg({...ng,monthly:v})} prefix="$" />
        <Btn onClick={add} style={{ width:"100%" }}>+ Add Goal</Btn>
      </Card>}
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Goals ({savings.length})</div>
        {!savings.length&&<div style={{ color:"#475569",fontSize:13,textAlign:"center",padding:40 }}>No savings goals yet.</div>}
        {savings.map(g => { const pct=g.target>0?(g.saved/g.target)*100:0; const rem=Math.max(0,g.target-g.saved); const mtg=g.monthly>0?Math.ceil(rem/g.monthly):Infinity;
          const gm = pct>=100?"⭐ Goal reached!":pct>=75?"🔥 Almost there!":pct>=50?"⚡ Halfway!":pct>=25?"💪 Great progress!":null;
          return (<div key={g.id} style={{ padding:16,background:"rgba(255,255,255,0.02)",borderRadius:12,marginBottom:12,border:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}><div style={{ display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:24 }}>{g.icon}</span><div><div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>{g.name}</div><div style={{ fontSize:11,color:"#64748b" }}>{mtg<Infinity?`${mtg} months to go`:"Set a contribution"}</div></div></div><button onClick={() => rm(g.id)} style={{ background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:18 }}>×</button></div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:12,color:"#94a3b8" }}>{formatCurrency(g.saved)} of {formatCurrency(g.target)}</span><span style={{ fontSize:12,fontWeight:600,color:"#38bdf8" }}>{pct.toFixed(0)}%</span></div>
            <MiniBar value={g.saved} max={g.target} color="#38bdf8" height={10} />
            {gm&&<div style={{ fontSize:11,color:"#38bdf8",marginTop:6,fontWeight:600 }}>{gm}</div>}
            {/* Quick deposit & edit controls */}
            <div style={{ marginTop:10,display:"flex",gap:6,alignItems:"center" }}>
              {[25,50,100,250].map(amt => (
                <button key={amt} onClick={() => setSavings(savings.map(s => s.id===g.id?{...s,saved:Math.min(s.saved+amt,s.target)}:s))} style={{ padding:"5px 10px",borderRadius:6,background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.15)",color:"#38bdf8",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>+${amt}</button>
              ))}
              <div style={{ marginLeft:"auto",display:"flex",gap:4,alignItems:"center" }}>
                <input type="number" placeholder="Custom" style={{ width:70,padding:"5px 6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#e2e8f0",fontSize:10,fontFamily:"'DM Sans',sans-serif",outline:"none",textAlign:"right" }} onKeyDown={e => { if(e.key==="Enter"&&e.target.value) { const v=Number(e.target.value); if(v>0) { setSavings(savings.map(s => s.id===g.id?{...s,saved:Math.min(s.saved+v,s.target)}:s)); e.target.value=""; } }}} />
                <input type="number" placeholder="$/mo" defaultValue={g.monthly||""} onBlur={e => { const v=Number(e.target.value); if(v>=0) setSavings(savings.map(s => s.id===g.id?{...s,monthly:v}:s)); }} onKeyDown={e => { if(e.key==="Enter") e.target.blur(); }} style={{ width:55,padding:"5px 4px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#e2e8f0",fontSize:10,fontFamily:"'DM Sans',sans-serif",outline:"none",textAlign:"right" }} />
              </div>
            </div>
            <div style={{ fontSize:9,color:"#475569",marginTop:4 }}>Monthly: {formatCurrency(g.monthly)} · {pct>=100?"Completed!":rem>0?`${formatCurrency(rem)} remaining`:""}</div>
          </div>); })}
        {/* Savings tips */}
        {savings.length>0&&(()=>{
          const totalSaved=savings.reduce((s,g)=>s+g.saved,0);
          const totalTarget=savings.reduce((s,g)=>s+g.target,0);
          const overallPct=totalTarget>0?(totalSaved/totalTarget)*100:0;
          const tip = overallPct>=90?"Almost there on all goals! Consider setting new stretch goals."
            :overallPct>=50?"Great savings momentum. Consider automating transfers on payday."
            :savings.some(g=>g.monthly===0)?"Set a monthly contribution on all goals — even $20/mo adds up."
            :"Tip: Pay yourself first. Set up auto-transfers the day you get paid.";
          return (<div style={{ marginTop:8,padding:10,background:"rgba(56,189,248,0.04)",borderRadius:8,border:"1px solid rgba(56,189,248,0.08)",fontSize:11,color:"#38bdf8" }}>💡 {tip}</div>);
        })()}
      </Card>
    </div>
  </div>);
}

// ═══ INVESTMENTS (ETFs with bonus injection) ═══
function Investments({ investments, setInvestments, cleanMode }) {
  const [fundProjection, setFundProjection] = useState(null);
  const [ni, setNi] = useState({ name:"",ticker:"",monthlyContribution:0,currentValue:0,totalContributed:0,returnRate:8 });
  const [ba, setBa] = useState(0); const [bt, setBt] = useState(""); const [py, setPy] = useState(20);
  const [extraM, setExtraM] = useState(0);
  const [graphMode, setGraphMode] = useState("both");
  const [showTimeSim, setShowTimeSim] = useState(false);
  const [showGrowth, setShowGrowth] = useState(true);
  const [simYears, setSimYears] = useState(10);
  const [simMonths, setSimMonths] = useState(0);
  const add = () => { if(!ni.name) return; setInvestments([...investments,{...ni,id:Date.now(),totalContributed:ni.currentValue}]); setNi({name:"",ticker:"",monthlyContribution:0,currentValue:0,totalContributed:0,returnRate:8}); };
  const rm = id => setInvestments(investments.filter(i => i.id!==id));
  const inject = () => { if(!bt||ba<=0) return; setInvestments(investments.map(inv => inv.id===Number(bt)?{...inv,currentValue:inv.currentValue+ba,totalContributed:inv.totalContributed+ba}:inv)); setBa(0); setBt(""); };
  const tv = investments.reduce((a,i) => a+i.currentValue, 0);
  const tc = investments.reduce((a,i) => a+i.totalContributed, 0);
  const tm = investments.reduce((a,i) => a+i.monthlyContribution, 0);

  const extraPerFund = investments.length > 0 ? extraM / investments.length : 0;
  const projs = useMemo(() => investments.map(inv => {
    const data=[]; let bal=inv.currentValue; const mr=inv.returnRate/100/12; const mc=inv.monthlyContribution+extraPerFund;
    for(let y=1;y<=py;y++) { for(let m=0;m<12;m++) bal=(bal+mc)*(1+mr); data.push({year:y,value:bal,contributed:inv.totalContributed+mc*12*y}); }
    return {...inv,projection:data,finalValue:bal};
  }), [investments,py,extraPerFund]);

  const portProj = useMemo(() => {
    const data=[];
    for(let y=1;y<=py;y++) { let t=0,c=0; projs.forEach(p => { if(p.projection[y-1]) { t+=p.projection[y-1].value; c+=p.projection[y-1].contributed; } }); data.push({year:y,value:t,contributed:c}); }
    return data;
  }, [projs,py]);
  const fp = portProj[portProj.length-1];
  const pg = fp?fp.value-fp.contributed:0;

  const bonusProj = useMemo(() => {
    if(ba<=0||!investments.length) return null;
    const tgt = investments.find(i => i.id===Number(bt))||investments[0]; if(!tgt) return null;
    const wo=[],wb=[]; let bA=tgt.currentValue,bB=tgt.currentValue+ba; const mr=tgt.returnRate/100/12;
    for(let y=1;y<=Math.min(py,10);y++) { for(let m=0;m<12;m++) { bA=(bA+tgt.monthlyContribution)*(1+mr); bB=(bB+tgt.monthlyContribution)*(1+mr); } wo.push(bA); wb.push(bB); }
    return {withoutBonus:wo,withBonus:wb,diff:bB-bA};
  }, [ba,bt,investments,py]);

  const im = tv>=50000?{icon:"👑",text:"Portfolio over $50K!",color:"#fbbf24"}:tv>=10000?{icon:"💎",text:"$10K invested!",color:"#a78bfa"}:tv>=1000?{icon:"📈",text:"$1K invested!",color:"#a78bfa"}:tv>0?{icon:"🌱",text:"You've started investing!",color:"#a78bfa"}:null;

  return (<div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
      {!cleanMode&&<Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Add Investment / ETF</div>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:8 }}><Field label="Fund Name" value={ni.name} onChange={v => setNi({...ni,name:v})} type="text" placeholder="e.g. Vanguard S&P 500" /><Field label="Ticker" value={ni.ticker} onChange={v => setNi({...ni,ticker:v})} type="text" placeholder="VOO" /></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}><Field label="Current Value" value={ni.currentValue||""} onChange={v => setNi({...ni,currentValue:v})} prefix="$" /><Field label="Monthly DCA" value={ni.monthlyContribution||""} onChange={v => setNi({...ni,monthlyContribution:v})} prefix="$" /></div>
        <Slider label="Expected Annual Return" value={ni.returnRate} onChange={v => setNi({...ni,returnRate:v})} min={1} max={15} step={0.5} color="#a78bfa" suffix="%" />
        <Btn onClick={add} style={{ width:"100%" }}>+ Add Investment</Btn>
      </Card>}
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:16 }}>Portfolio Overview</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
          <div style={{ padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10 }}><div style={{ fontSize:11,color:"#64748b" }}>Total Value</div><div style={{ fontSize:22,fontWeight:800,color:"#a78bfa" }}>{formatCurrency(tv)}</div></div>
          <div style={{ padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10 }}><div style={{ fontSize:11,color:"#64748b" }}>Total Gain</div><div style={{ fontSize:22,fontWeight:800,color:tv-tc>=0?"#6ee7b7":"#f87171" }}>{tv-tc>=0?"+":""}{formatCurrency(tv-tc)}</div></div>
          {!cleanMode&&<><div style={{ padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10 }}><div style={{ fontSize:11,color:"#64748b" }}>Monthly DCA</div><div style={{ fontSize:18,fontWeight:700,color:"#e2e8f0" }}>{formatCurrency(tm)}</div></div>
          <div style={{ padding:14,background:"rgba(255,255,255,0.03)",borderRadius:10 }}><div style={{ fontSize:11,color:"#64748b" }}>Contributed</div><div style={{ fontSize:18,fontWeight:700,color:"#94a3b8" }}>{formatCurrency(tc)}</div></div></>}
        </div>
        {investments.length>0&&<div style={{ display:"flex",justifyContent:"center",marginBottom:12 }}><DonutChart size={140} thickness={22} centerLabel={formatCurrency(tv)} centerSub="portfolio" segments={investments.map((inv,i) => ({value:inv.currentValue,color:["#a78bfa","#6ee7b7","#38bdf8","#fbbf24","#f87171","#fb923c","#e879f9"][i%7]}))} /></div>}
        {investments.map((inv,i) => (<div key={inv.id} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}><div style={{ width:8,height:8,borderRadius:2,background:["#a78bfa","#6ee7b7","#38bdf8","#fbbf24","#f87171","#fb923c","#e879f9"][i%7] }} /><span style={{ fontSize:12,color:"#94a3b8",flex:1 }}>{inv.ticker||inv.name}</span><span style={{ fontSize:12,fontWeight:600,color:"#e2e8f0" }}>{formatCurrency(inv.currentValue)}</span></div>))}
        {im&&investments.length>0&&<div style={{ marginTop:12,padding:12,background:`${im.color}08`,borderRadius:10,border:`1px solid ${im.color}20`,display:"flex",alignItems:"center",gap:10 }}><span style={{ fontSize:20 }}>{im.icon}</span><span style={{ fontSize:12,color:im.color,fontWeight:600 }}>{im.text}</span></div>}
      </Card>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:10 }}>Growth Projection</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div style={{ display:"flex",gap:4 }}>{[{k:"both",l:"Both"},{k:"growth",l:"Growth"},{k:"contrib",l:"Contributed"}].map(g => (<button key={g.k} onClick={() => setGraphMode(g.k)} style={{ padding:"5px 10px",borderRadius:6,border:graphMode===g.k?"1px solid #6ee7b7":"1px solid rgba(255,255,255,0.06)",background:graphMode===g.k?"rgba(110,231,183,0.08)":"transparent",color:graphMode===g.k?"#6ee7b7":"#475569",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{g.l}</button>))}</div>
            <div style={{ display:"flex",gap:4 }}>{[10,20,30].map(y => (<button key={y} onClick={() => setPy(y)} style={{ padding:"5px 10px",borderRadius:6,border:py===y?"1px solid #a78bfa":"1px solid rgba(255,255,255,0.08)",background:py===y?"rgba(167,139,250,0.1)":"transparent",color:py===y?"#a78bfa":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{y}yr</button>))}</div>
          </div>
        {portProj.length>0&&investments.length>0?(<>
          <div style={{ position:"relative",height:160,marginBottom:8 }}>
            <svg width="100%" height="160" viewBox={`0 0 ${portProj.length*20} 160`} preserveAspectRatio="none" style={{ position:"absolute",top:0,left:0 }}>
              <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" /><stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" /></linearGradient><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#475569" stopOpacity="0.3" /><stop offset="100%" stopColor="#475569" stopOpacity="0.05" /></linearGradient></defs>
              {(() => { const mx=Math.max(...portProj.map(d => d.value),1), w=portProj.length*20;
                const gp=portProj.map((d,i) => `${(i/(portProj.length-1))*w},${160-(d.value/mx)*150}`).join(" L");
                const cp=portProj.map((d,i) => `${(i/(portProj.length-1))*w},${160-(d.contributed/mx)*150}`).join(" L");
                return (<>{(graphMode==="both"||graphMode==="growth")&&<><path d={`M0,160 L${gp} L${w},160 Z`} fill="url(#gg)" /><polyline points={gp} fill="none" stroke="#a78bfa" strokeWidth="2" /></>}{(graphMode==="both"||graphMode==="contrib")&&<><path d={`M0,160 L${cp} L${w},160 Z`} fill="url(#cg)" /><polyline points={cp} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,4" /></>}</>);
              })()}
            </svg>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginBottom:12 }}><span>Year 1</span><span>Year {Math.floor(py/2)}</span><span>Year {py}</span></div>
          <div style={{ display:"flex",gap:16 }}><div style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ width:10,height:2,background:"#a78bfa",borderRadius:1 }} /><span style={{ fontSize:11,color:"#a78bfa" }}>Growth</span></div><div style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ width:10,height:2,background:"#475569",borderRadius:1 }} /><span style={{ fontSize:11,color:"#64748b" }}>Contributed</span></div></div>
          <div style={{ marginTop:12,padding:12,background:"rgba(167,139,250,0.06)",borderRadius:10,border:"1px solid rgba(167,139,250,0.12)" }}><div style={{ fontSize:11,color:"#94a3b8" }}>In {py} years your portfolio could be worth</div><div style={{ fontSize:24,fontWeight:800,color:"#a78bfa" }}>{formatCurrency(fp?.value||0)}</div><div style={{ fontSize:11,color:"#6ee7b7",marginTop:2 }}>+{formatCurrency(pg)} in gains ({((pg/(fp?.contributed||1))*100).toFixed(0)}% return) · {formatCurrency(fp?.contributed||0)} contributed</div></div>
          <div style={{ marginTop:12 }}>
            <Slider label="Extra Monthly (all funds)" value={extraM} onChange={setExtraM} min={0} max={2000} color="#6ee7b7" suffix="" />
            {extraM>0&&<div style={{ textAlign:"center",fontSize:11,color:"#6ee7b7",marginBottom:4 }}>+{formatCurrency(extraM)}/mo extra across {investments.length} fund{investments.length>1?"s":""}</div>}
          </div>
          <div style={{ marginTop:10 }}>
            <button onClick={() => setShowTimeSim(!showTimeSim)} style={{ width:"100%",padding:"8px 12px",borderRadius:8,background:showTimeSim?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.03)",border:showTimeSim?"1px solid rgba(251,191,36,0.15)":"1px solid rgba(255,255,255,0.06)",color:showTimeSim?"#fbbf24":"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{showTimeSim?"Hide":"Show"} Time Simulator</button>
            {showTimeSim&&(<div style={{ marginTop:10,padding:12,background:"rgba(251,191,36,0.04)",borderRadius:10,border:"1px solid rgba(251,191,36,0.1)" }}>
              <Slider label="Years" value={simYears} onChange={setSimYears} min={1} max={40} color="#fbbf24" suffix=" yr" />
              <Slider label="Extra Months" value={simMonths} onChange={setSimMonths} min={0} max={11} color="#fbbf24" suffix=" mo" />
              {(()=>{
                const totalM = simYears*12+simMonths;
                let simVal=0,simCont=0;
                investments.forEach(inv => {
                  let b=inv.currentValue; const mr=inv.returnRate/100/12; const mc=inv.monthlyContribution+extraPerFund;
                  for(let m=0;m<totalM;m++) b=(b+mc)*(1+mr);
                  simVal+=b; simCont+=inv.totalContributed+mc*totalM;
                });
                const simGain=simVal-simCont;
                return (<div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8 }}>
                  <div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Portfolio</div><div style={{ fontSize:16,fontWeight:800,color:"#a78bfa" }}>{formatCurrency(simVal)}</div></div>
                  <div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Contributed</div><div style={{ fontSize:16,fontWeight:800,color:"#94a3b8" }}>{formatCurrency(simCont)}</div></div>
                  <div style={{ padding:10,background:"rgba(255,255,255,0.03)",borderRadius:8,textAlign:"center" }}><div style={{ fontSize:9,color:"#64748b" }}>Gains</div><div style={{ fontSize:16,fontWeight:800,color:"#6ee7b7" }}>+{formatCurrency(simGain)}</div></div>
                </div>);
              })()}
            </div>)}
          </div>
        </>):(<div style={{ color:"#475569",fontSize:13,textAlign:"center",padding:40 }}>Add investments to see projections</div>)}
      </Card>
      {!cleanMode&&<Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>Bonus / Extra Injection</div>
        <div style={{ fontSize:11,color:"#475569",marginBottom:16 }}>Simulate redirecting a bonus or commission into your investments</div>
        <Field label="Injection Amount" value={ba||""} onChange={setBa} prefix="$" placeholder="e.g. 5000" />
        {investments.length>0&&<div style={{ marginBottom:14 }}><label style={{ fontSize:12,color:"#94a3b8",display:"block",marginBottom:4 }}>Target Fund</label>
          <select value={bt} onChange={e => setBt(e.target.value)} style={{ width:"100%",padding:"10px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e2e8f0",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none" }}>
            <option value="" style={{ background:"#1e293b" }}>Select fund...</option>
            {investments.map(inv => <option key={inv.id} value={inv.id} style={{ background:"#1e293b" }}>{inv.ticker||inv.name} — {formatCurrency(inv.currentValue)}</option>)}
          </select></div>}
        <Btn onClick={inject} style={{ width:"100%",marginBottom:16 }}>💰 Inject Bonus</Btn>
        {bonusProj&&ba>0&&(<>
          <div style={{ fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8 }}>Impact of {formatCurrency(ba)} Injection</div>
          <div style={{ display:"flex",alignItems:"flex-end",gap:6,height:100,marginBottom:8 }}>{bonusProj.withBonus.map((v,i) => (<div key={i} style={{ flex:1,display:"flex",gap:2,alignItems:"flex-end",height:"100%" }}><div style={{ flex:1,height:`${(bonusProj.withoutBonus[i]/bonusProj.withBonus[bonusProj.withBonus.length-1])*100}%`,background:"rgba(255,255,255,0.08)",borderRadius:"3px 3px 0 0" }} /><div style={{ flex:1,height:`${(v/bonusProj.withBonus[bonusProj.withBonus.length-1])*100}%`,background:"linear-gradient(to top, rgba(110,231,183,0.3), rgba(110,231,183,0.6))",borderRadius:"3px 3px 0 0" }} /></div>))}</div>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#475569",marginBottom:12 }}>{bonusProj.withBonus.map((_,i) => <span key={i}>Yr {i+1}</span>)}</div>
          <div style={{ padding:12,background:"rgba(110,231,183,0.06)",borderRadius:10,border:"1px solid rgba(110,231,183,0.12)" }}><div style={{ fontSize:11,color:"#94a3b8" }}>A single {formatCurrency(ba)} injection could add</div><div style={{ fontSize:22,fontWeight:800,color:"#6ee7b7" }}>+{formatCurrency(bonusProj.diff)}</div><div style={{ fontSize:11,color:"#475569" }}>extra over {Math.min(py,10)} years through compound growth</div></div>
        </>)}
      </Card>}
      <Card>
        <div style={{ fontSize:12,fontWeight:600,color:"#94a3b8",marginBottom:8 }}>Your Funds</div>
          {investments.map(inv => { const p=projs.find(x => x.id===inv.id); return (<div key={inv.id} style={{ padding:12,background:"rgba(255,255,255,0.02)",borderRadius:10,marginBottom:8,border:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><div><div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{inv.name} {inv.ticker&&<span style={{ color:"#64748b" }}>({inv.ticker})</span>} <button onClick={() => setFundProjection(fundProjection===inv.id?null:inv.id)} style={{ background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:4,color:fundProjection===inv.id?"#a78bfa":"#475569",fontSize:8,cursor:"pointer",padding:"1px 5px",fontFamily:"'DM Sans',sans-serif" }}>{fundProjection===inv.id?"Hide":"Project"}</button></div><div style={{ fontSize:11,color:"#64748b" }}>{fundProjection===inv.id&&<div style={{ margin:"8px 0",padding:8,background:"rgba(167,139,250,0.04)",borderRadius:6 }}><div style={{ display:"flex",alignItems:"flex-end",gap:1,height:40 }}>{Array.from({length:10},(_,y)=>{const fv=inv.currentValue*Math.pow(1+inv.returnRate/100,y+1)+inv.monthlyContribution*12*(y+1);const max2=inv.currentValue*Math.pow(1+inv.returnRate/100,10)+inv.monthlyContribution*120;return <div key={y} style={{ flex:1,height:`${(fv/max2)*100}%`,background:"linear-gradient(to top,rgba(167,139,250,0.3),rgba(167,139,250,0.6))",borderRadius:"2px 2px 0 0",minHeight:2 }} />})}</div><div style={{ display:"flex",justifyContent:"space-between",fontSize:8,color:"#475569",marginTop:2 }}><span>1yr: {formatCurrency(inv.currentValue*(1+inv.returnRate/100)+inv.monthlyContribution*12)}</span><span>10yr: {formatCurrency(inv.currentValue*Math.pow(1+inv.returnRate/100,10)+inv.monthlyContribution*120)}</span></div></div>}
            {!cleanMode?`${inv.returnRate}% avg · ${formatCurrency(inv.monthlyContribution)}/mo DCA · ${formatCurrency(inv.totalContributed)} contributed`:""}</div></div><button onClick={() => rm(inv.id)} style={{ background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:16 }}>×</button></div>
            <div style={{ display:"flex",gap:16,marginTop:8 }}><div><div style={{ fontSize:10,color:"#475569" }}>Current</div><div style={{ fontSize:14,fontWeight:700,color:"#a78bfa" }}>{formatCurrency(inv.currentValue)}</div></div><div><div style={{ fontSize:10,color:"#475569" }}>Projected</div><div style={{ fontSize:14,fontWeight:700,color:"#fbbf24" }}>{formatCurrency(p?.finalValue||0)}</div></div><div><div style={{ fontSize:10,color:"#475569" }}>Gain</div><div style={{ fontSize:14,fontWeight:700,color:"#6ee7b7" }}>+{formatCurrency((p?.finalValue||0)-inv.totalContributed-inv.monthlyContribution*12*py)}</div></div></div>
          </div>); })}
      </Card>
    </div>
  </div>);
}

// ═══ TIPS & ADVICE (contextual, auto-updating) ═══
function TipsAdvice({ income, expenses, debts, savings, emergency, investments, cleanMode }) {
  const [tipsCollapsed, setTipsCollapsed] = useState(true);
  const tips = useMemo(() => {
    const t = [];
    const te = expenses.reduce((s,e) => s+e.amount, 0);
    const td = debts.reduce((s,d) => s+d.balance, 0);
    const ts = savings.reduce((s,g) => s+g.saved, 0);
    const tg = savings.reduce((s,g) => s+g.target, 0);
    const ti = investments.reduce((a,i) => a+i.currentValue, 0);
    const tc = investments.reduce((a,i) => a+i.totalContributed, 0);
    const tm = investments.reduce((a,i) => a+i.monthlyContribution, 0);
    const nw = emergency.saved + ts + ti - td;
    const expRatio = income > 0 ? te / income : 1;
    const dtiRatio = income > 0 ? td / (income * 12) : 0;
    const freeCash = income - te;
    const emergPct = emergency.target > 0 ? emergency.saved / emergency.target : 0;
    const highIntDebts = debts.filter(d => d.rate > 15);
    const savingsRate = income > 0 ? (freeCash / income) * 100 : 0;

    // ═══ EMERGENCY FUND ═══
    if (emergPct < 0.1) t.push({ cat: "Emergency", priority: "high", icon: "🚨", color: "#f87171", title: "Start Your Emergency Fund Now", text: `You have ${formatCurrency(emergency.saved)} saved against a ${formatCurrency(emergency.target)} goal. Even ${formatCurrency(50)}/mo gets you to ${formatCurrency(emergency.saved + 600)} in a year. Start today — this is your #1 financial safety net.`, action: "Go to Emergency Fund tab →" });
    else if (emergPct < 0.5) t.push({ cat: "Emergency", priority: "medium", icon: "🛡️", color: "#fbbf24", title: "Keep Building Your Safety Net", text: `You're ${(emergPct*100).toFixed(0)}% to your ${emergency.months}-month emergency fund. At ${formatCurrency(emergency.monthlyContribution)}/mo, you'll hit it in ${Math.ceil((emergency.target-emergency.saved)/emergency.monthlyContribution)} months. Consider bumping it to ${formatCurrency(emergency.monthlyContribution+100)} to get there ${Math.ceil((emergency.target-emergency.saved)/(emergency.monthlyContribution+100))} months sooner.` });
    else if (emergPct < 1) t.push({ cat: "Emergency", priority: "low", icon: "⚡", color: "#6ee7b7", title: "Emergency Fund Almost Full", text: `${(emergPct*100).toFixed(0)}% funded — only ${formatCurrency(emergency.target - emergency.saved)} to go. You're in great shape. Once full, redirect that ${formatCurrency(emergency.monthlyContribution)}/mo toward investments or debt.` });
    else t.push({ cat: "Emergency", priority: "done", icon: "✅", color: "#6ee7b7", title: "Emergency Fund Fully Funded!", text: "Amazing! You have financial security covered. Now focus your energy on investments and savings goals." });

    // ═══ DEBT ═══
    if (highIntDebts.length > 0) t.push({ cat: "Debt", priority: "high", icon: "🔥", color: "#f87171", title: "Tackle High-Interest Debt First", text: `You have ${highIntDebts.length} debt(s) above 15% APR costing you roughly ${formatCurrency(highIntDebts.reduce((s,d) => s + d.balance * d.rate / 100 / 12, 0))}/mo in interest alone. Every extra dollar here saves you the most. Consider the avalanche method.` });
    if (td > 0 && dtiRatio > 0.36) t.push({ cat: "Debt", priority: "high", icon: "⚠️", color: "#fb923c", title: "Debt-to-Income Ratio is High", text: `Your DTI is ${(dtiRatio*100).toFixed(0)}% (debt ${formatCurrency(td)} vs annual income ${formatCurrency(income*12)}). Lenders view anything above 36% as risky. Focus on aggressive repayment — even an extra ${formatCurrency(100)}/mo makes a big difference.` });
    else if (td > 0) t.push({ cat: "Debt", priority: "medium", icon: "💳", color: "#fbbf24", title: "Stay Consistent on Debt Payoff", text: `Total debt: ${formatCurrency(td)} with a healthy DTI of ${(dtiRatio*100).toFixed(0)}%. Keep up your payments. Consider if any refinancing options could lower your rates.` });
    if (td === 0 && debts.length > 0) t.push({ cat: "Debt", priority: "done", icon: "🎉", color: "#6ee7b7", title: "Debt Free!", text: "No outstanding debt — this is a massive accomplishment. Redirect former payments to investments." });

    // ═══ BUDGET ═══
    if (expRatio > 0.9) t.push({ cat: "Budget", priority: "high", icon: "📊", color: "#f87171", title: "Expenses Are Too Close to Income", text: `You're spending ${(expRatio*100).toFixed(0)}% of income (${formatCurrency(te)} of ${formatCurrency(income)}). That leaves only ${formatCurrency(freeCash)}/mo. Review your largest categories for cuts — even reducing by 10% frees up ${formatCurrency(te * 0.1)}/mo.` });
    else if (expRatio > 0.7) t.push({ cat: "Budget", priority: "medium", icon: "📋", color: "#fbbf24", title: "Tighten Your Budget", text: `You're at ${(expRatio*100).toFixed(0)}% of income on expenses. Your ${formatCurrency(freeCash)}/mo surplus is good but could be better. The 50/30/20 rule suggests needs should be 50% max — check if any wants are creeping into needs.` });
    else t.push({ cat: "Budget", priority: "low", icon: "✨", color: "#6ee7b7", title: "Excellent Budget Control", text: `Only ${(expRatio*100).toFixed(0)}% of income on expenses, leaving ${formatCurrency(freeCash)}/mo for savings and investing. Well done.` });
    if (freeCash > 500 && ti === 0) t.push({ cat: "Budget", priority: "medium", icon: "💡", color: "#38bdf8", title: "You Have Cash to Invest", text: `With ${formatCurrency(freeCash)}/mo free, you could easily start investing. Even ${formatCurrency(200)}/mo in an index fund at 8% avg return could grow to ${formatCurrency(Math.round(200 * ((Math.pow(1+0.08/12, 120)-1)/(0.08/12))))} in 10 years.` });

    // ═══ SAVINGS ═══
    const unmetGoals = savings.filter(g => g.saved < g.target);
    if (unmetGoals.length > 0) {
      const closest = unmetGoals.reduce((b,g) => { const p=g.target>0?g.saved/g.target:0; return (!b||p>b.pct)?{...g,pct:p}:b; },null);
      if (closest && closest.pct > 0.7) t.push({ cat: "Savings", priority: "low", icon: "🎯", color: "#38bdf8", title: `"${closest.name}" is Almost There`, text: `${(closest.pct*100).toFixed(0)}% done — only ${formatCurrency(closest.target-closest.saved)} to go. A one-time boost could finish this goal!` });
    }
    if (savings.some(g => g.monthly === 0 && g.saved < g.target)) t.push({ cat: "Savings", priority: "medium", icon: "🔄", color: "#fbbf24", title: "Set Auto-Contributions", text: "Some goals don't have monthly contributions. Automate even a small amount — consistency beats sporadic large deposits." });

    // ═══ INVESTMENTS ═══
    if (ti === 0) t.push({ cat: "Invest", priority: "medium", icon: "📈", color: "#a78bfa", title: "Start Investing", text: `You haven't started investing yet. Time in the market > timing the market. Even ${formatCurrency(100)}/mo in a broad index fund is a great start.` });
    else {
      const gain = ti - tc;
      if (gain > 0) t.push({ cat: "Invest", priority: "low", icon: "💎", color: "#a78bfa", title: "Investments Are Growing", text: `Your portfolio is up ${formatCurrency(gain)} (+${((gain/tc)*100).toFixed(1)}%). Keep DCA'ing ${formatCurrency(tm)}/mo. Consistency is your superpower.` });
      if (tm < freeCash * 0.15 && freeCash > 300) t.push({ cat: "Invest", priority: "medium", icon: "🚀", color: "#a78bfa", title: "Consider Increasing DCA", text: `You invest ${formatCurrency(tm)}/mo but have ${formatCurrency(freeCash)}/mo free. Increasing to ${formatCurrency(Math.round(freeCash*0.2))} could significantly boost long-term growth.` });
    }

    // ═══ NET WORTH ═══
    if (nw < 0) t.push({ cat: "Net Worth", priority: "high", icon: "🌱", color: "#fb923c", title: "Your Net Worth is Negative — That's OK", text: `At ${formatCurrency(nw)}, your debts exceed your assets by ${formatCurrency(Math.abs(nw))}. This is common early on, especially with student loans. Focus on the trajectory — every payment improves it. You're already taking the right steps by tracking it.` });
    else if (nw > 0) t.push({ cat: "Net Worth", priority: "low", icon: "🌟", color: "#6ee7b7", title: "Positive Net Worth!", text: `Your net worth is ${formatCurrency(nw)}. Assets exceed liabilities. Keep building — compound growth accelerates over time.` });

    // Sort: high > medium > low > done
    const order = { high: 0, medium: 1, low: 2, done: 3 };
    t.sort((a, b) => order[a.priority] - order[b.priority]);
    return t;
  }, [income, expenses, debts, savings, emergency, investments]);

  const categories = [...new Set(tips.map(t => t.cat))];

  return (<div>
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:18,fontWeight:700,color:"#e2e8f0",marginBottom:4 }}>Personalized Tips & Advice</div>
      <div style={{ fontSize:12,color:"#475569" }}>Auto-generated based on your current financial data. Updates as your situation changes.</div>
    </div>
    {cleanMode&&<button onClick={() => setTipsCollapsed(!tipsCollapsed)} style={{ width:"100%",padding:"10px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:10,display:"flex",justifyContent:"space-between" }}><span>{tips.length} tips</span><span>{tipsCollapsed?"\u25bc":"\u25b2"}</span></button>}
    {(!cleanMode||!tipsCollapsed)&&    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <div>
        {tips.filter((_,i) => i%2===0).map((tip,i) => (
          <div key={i} style={{ padding:16,marginBottom:12,borderRadius:14,background:"rgba(255,255,255,0.02)",border:`1px solid ${tip.color}12`,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:0,left:0,width:3,height:"100%",background:tip.color,borderRadius:"3px 0 0 3px" }} />
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
              <span style={{ fontSize:18 }}>{tip.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#e2e8f0" }}>{tip.title}</div>
                <div style={{ display:"flex",gap:6,marginTop:2 }}>
                  <span style={{ fontSize:9,color:tip.color,background:`${tip.color}15`,padding:"1px 6px",borderRadius:4,fontWeight:600 }}>{tip.cat}</span>
                  <span style={{ fontSize:9,color:tip.priority==="high"?"#f87171":tip.priority==="medium"?"#fbbf24":"#6ee7b7",fontWeight:600 }}>{tip.priority==="done"?"✓ Achieved":tip.priority}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.6,paddingLeft:26 }}>{tip.text}</div>
            {tip.action&&<div style={{ marginTop:8,paddingLeft:26 }}><span style={{ fontSize:10,color:tip.color,fontWeight:600,cursor:"pointer" }}>{tip.action}</span></div>}
          </div>
        ))}
      </div>
      <div>
        {tips.filter((_,i) => i%2===1).map((tip,i) => (
          <div key={i} style={{ padding:16,marginBottom:12,borderRadius:14,background:"rgba(255,255,255,0.02)",border:`1px solid ${tip.color}12`,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:0,left:0,width:3,height:"100%",background:tip.color,borderRadius:"3px 0 0 3px" }} />
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
              <span style={{ fontSize:18 }}>{tip.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#e2e8f0" }}>{tip.title}</div>
                <div style={{ display:"flex",gap:6,marginTop:2 }}>
                  <span style={{ fontSize:9,color:tip.color,background:`${tip.color}15`,padding:"1px 6px",borderRadius:4,fontWeight:600 }}>{tip.cat}</span>
                  <span style={{ fontSize:9,color:tip.priority==="high"?"#f87171":tip.priority==="medium"?"#fbbf24":"#6ee7b7",fontWeight:600 }}>{tip.priority==="done"?"✓ Achieved":tip.priority}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.6,paddingLeft:26 }}>{tip.text}</div>
            {tip.action&&<div style={{ marginTop:8,paddingLeft:26 }}><span style={{ fontSize:10,color:tip.color,fontWeight:600,cursor:"pointer" }}>{tip.action}</span></div>}
          </div>
        ))}
      </div>
    </div>}
    {/* Priority summary + motivational quote */}
    {!cleanMode&&<Card style={{ marginTop:8 }}>
      {(() => {
        const urgent = tips.filter(t=>t.priority==="high").length;
        const improve = tips.filter(t=>t.priority==="medium").length;
        const onTrack = tips.filter(t=>t.priority==="low").length;
        const achieved = tips.filter(t=>t.priority==="done").length;
        const total = tips.length;
        const ratio = total > 0 ? (onTrack + achieved) / total : 0;
        const quote = ratio >= 0.8 ? { text: "Financial freedom is not about being rich. It's about having choices.", author: "Dave Ramsey", color: "#6ee7b7" }
          : ratio >= 0.5 ? { text: "The secret to getting ahead is getting started.", author: "Mark Twain", color: "#fbbf24" }
          : ratio >= 0.3 ? { text: "It's not about how much money you make. It's about how much you keep.", author: "Robert Kiyosaki", color: "#fb923c" }
          : { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", color: "#38bdf8" };
        return (<div>
          <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center",marginBottom:14 }}>
            {[{label:"Urgent",count:urgent,color:"#f87171"},{label:"Improve",count:improve,color:"#fbbf24"},{label:"On Track",count:onTrack,color:"#6ee7b7"},{label:"Achieved",count:achieved,color:"#38bdf8"}].map((s,i) => (
              <div key={i} style={{ textAlign:"center" }}><div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.count}</div><div style={{ fontSize:10,color:"#64748b" }}>{s.label}</div></div>
            ))}
          </div>
          <div style={{ textAlign:"center",padding:"12px 20px",background:`${quote.color}06`,borderRadius:10,border:`1px solid ${quote.color}12` }}>
            <div style={{ fontSize:13,color:quote.color,fontStyle:"italic",lineHeight:1.6 }}>"{quote.text}"</div>
            <div style={{ fontSize:10,color:"#64748b",marginTop:4 }}>— {quote.author}</div>
          </div>
        </div>);
      })()}
    </Card>}
  </div>);
}

// ═══ LEARN (Glossary + Adaptive Quiz) ═══
const TERMS = [
  { term:"Emergency Fund", simple:"Money set aside for unexpected events like job loss or car repair. Usually 3-6 months of expenses.", detail:"An emergency fund is your financial safety net. Experts recommend keeping 3-6 months of living expenses in a liquid, easily accessible account. Start small — even $500 can cover most minor emergencies. Keep it separate from your checking account to avoid spending it. A HYSA is ideal for this since it earns interest while staying accessible. Common emergencies: job loss, medical bills, car repairs, home repairs.", cat:"Basics" },
  { term:"Net Worth", simple:"Everything you own (assets) minus everything you owe (debts). Can be negative — that's OK early on!", detail:"Net worth = Total Assets - Total Liabilities. Assets include savings, investments, property, and valuables. Liabilities include all debts like mortgages, loans, and credit cards. A negative net worth is very common for young adults with student loans. Track it monthly — the trend matters more than the number. Increasing your net worth by even $100/month means you're moving in the right direction.", cat:"Basics" },
  { term:"APR", simple:"Annual Percentage Rate — the yearly interest rate on a debt. Higher = more expensive to borrow.", detail:"APR represents the true yearly cost of borrowing money, including fees. A 20% APR on a $5,000 credit card balance means you'd pay roughly $1,000/year in interest if you only made minimum payments. APR can be fixed (stays the same) or variable (changes with market rates). Always compare APRs when shopping for loans. Even a 1-2% difference can save thousands over a loan's lifetime.", cat:"Debt" },
  { term:"Debt-to-Income (DTI)", simple:"Your total monthly debt payments compared to your monthly income. Below 36% is healthy.", detail:"DTI is calculated by dividing your total monthly debt payments by your gross monthly income. Lenders use DTI to evaluate your ability to manage payments. Under 20% is excellent, 20-36% is good, 36-43% is concerning, and above 43% makes it very difficult to get approved for new credit. To lower your DTI: pay down debt, increase income, or avoid taking on new debt.", cat:"Debt" },
  { term:"Avalanche Method", simple:"Pay off highest-interest debt first. Saves the most money long-term.", detail:"List all debts by interest rate from highest to lowest. Make minimum payments on all debts, then put every extra dollar toward the highest-rate debt. Once it's paid off, move to the next highest. This method is mathematically optimal — it minimizes total interest paid. Best for disciplined people who are motivated by saving money rather than quick wins.", cat:"Debt Strategy" },
  { term:"Snowball Method", simple:"Pay off smallest debts first. Quick wins keep you motivated.", detail:"List all debts by balance from smallest to largest. Make minimum payments on all debts, then throw extra money at the smallest balance. Once paid off, roll that payment into the next smallest. You'll pay more interest than avalanche, but the psychological wins of eliminating debts quickly keeps many people motivated to continue. Research shows people using snowball are more likely to become debt-free.", cat:"Debt Strategy" },
  { term:"Compound Interest", simple:"Your money making money on top of money. Like a snowball rolling downhill — it gets bigger and bigger!", detail:"Compound interest is often called the 8th wonder of the world. If you invest $10,000 at 8% annual return: after 10 years you'd have ~$21,589, after 20 years ~$46,610, and after 30 years ~$100,627. The key is TIME. Starting 10 years earlier can double your final amount. This same principle works against you with debt — unpaid credit card interest compounds, making balances grow rapidly.", cat:"Investing" },
  { term:"DCA (Dollar-Cost Averaging)", simple:"Putting the same amount of money into investments every month, no matter what. Like buying the same snack every week — sometimes it's on sale, sometimes not.", detail:"Every month, put the same amount of money in — say $100. When prices are high, your $100 buys less. When prices drop, your $100 buys MORE. Over time, this evens out and you don't have to worry about buying at the 'wrong' time. It's like buying apples every week — sometimes they're $1, sometimes $2, but on average you get a fair price.", cat:"Investing" },
  { term:"ETF (Exchange-Traded Fund)", simple:"Instead of buying one company, you buy a bundle of hundreds at once. Like a variety pack instead of one candy bar.", detail:"Instead of buying stock in one company (risky if they mess up), an ETF bundles hundreds or thousands into one package. Buy one ETF and you instantly own a tiny piece of 500+ companies. It's super cheap to own (often less than $3 per $10,000 invested per year) and you can buy or sell it easily. Popular ones: VOO and VTI.", cat:"Investing" },
  { term:"Index Fund", simple:"A fund that just copies the whole market instead of trying to pick winners. Simple, cheap, and usually beats the experts!", detail:"Instead of paying an expensive expert to pick stocks (who usually gets it wrong anyway), an index fund just buys ALL the stocks in a list. Sounds boring, but it beats 80-90% of the 'experts' over 10+ years. Even Warren Buffett, one of the richest people ever, tells normal people to just buy index funds. Simple beats clever.", cat:"Investing" },
  { term:"HYSA", simple:"High-Yield Savings Account — a savings account that pays much more interest (4-5%) than a regular one (0.5%).", detail:"Online banks don't need fancy buildings, so they share the savings with you as higher interest. Your money is just as safe as any bank (insured up to $250,000 by the government). No fees, no minimums, and you can transfer money to your regular bank in 1-2 days. Perfect for your emergency fund and any money you'll need in the next year or two.", cat:"Savings" },
  { term:"50/30/20 Rule", simple:"Spend 50% on needs, 30% on wants, 20% on savings/investing. A popular budgeting starting point.", detail:"Popularized by Senator Elizabeth Warren, this rule provides a simple framework: 50% of after-tax income goes to needs (rent, food, utilities, insurance, minimum debt payments), 30% to wants (dining out, entertainment, hobbies, upgrades), and 20% to savings and extra debt payments. It's a starting point — if you have high debt, you might do 50/20/30 (more to debt). If expenses are low, aim for a higher savings rate.", cat:"Budget" },
  { term:"Savings Rate", simple:"How much of your money you keep instead of spend. If you earn $10 and save $2, that's a 20% savings rate!", detail:"Savings rate = (Income - Spending) / Income × 100. The average American saves about 5-7%. Financial experts recommend 15-20% minimum. The FIRE (Financial Independence, Retire Early) movement aims for 50%+. Every 1% increase in your savings rate accelerates your path to financial freedom. The easiest way to increase it: automate savings on payday before you can spend it.", cat:"Budget" },
  { term:"Minimum Payment", simple:"The least you must pay on a debt each month. Paying only this = very slow and expensive payoff.", detail:"The minimum payment is the teeniest amount the credit card company says you must pay. It's designed to keep you in debt as long as possible. If you owe $5,000 and only pay minimums, it could take 25 YEARS and you'd pay $8,000 extra in interest — like buying the same thing twice! Always pay more than the minimum. Even $20 extra helps a ton.", cat:"Debt" },
  { term:"Portfolio", simple:"All your investments put together — like your whole collection of cards, not just one card.", detail:"A portfolio includes all your investment holdings: stocks, bonds, ETFs, real estate, etc. Asset allocation is how you divide your portfolio between asset types. A common rule of thumb: subtract your age from 110 to get your stock percentage (e.g., age 30 = 80% stocks, 20% bonds). Rebalance annually to maintain your target allocation. Diversification doesn't eliminate risk but reduces it significantly.", cat:"Investing" },
  { term:"Payment Plan", simple:"An agreement to pay off a large bill in smaller monthly installments instead of all at once.", detail:"Can't pay a big bill all at once? Just call and ask for a payment plan! Most hospitals, utility companies, and even the government will let you split it into smaller monthly chunks. It's usually free (no extra interest) and keeps your credit score safe. The magic words: 'Can I set up a payment plan?' They almost always say yes.", cat:"Debt" },
  { term:"Credit Score", simple:"A grade for how good you are at paying back money you borrowed. Higher score = banks trust you more and charge less.", detail:"Your credit score is mostly based on: do you pay on time? (biggest factor), how much do you owe compared to your limit?, and how long have you had credit? Above 740 is excellent. To boost it: always pay on time (set reminders!), don't use more than a third of your credit card limit, and don't open lots of new cards at once. Check your score for free — it doesn't hurt to look.", cat:"Basics" },
  { term:"Inflation", simple:"Prices going up over time. Your $100 today buys less stuff next year. That's why saving alone isn't enough.", detail:"Think of inflation as your money slowly shrinking. At 3% inflation, a $100 grocery trip this year costs $103 next year. In 20 years, it costs about $180. This is why just keeping money in a checking account actually makes you poorer over time — the number stays the same but it buys less. Investing (even conservatively) aims to grow your money faster than prices rise, so your purchasing power stays the same or grows.", cat:"Basics" },
  { term:"Liquidity", simple:"How fast you can turn something into cash you can spend. Cash = instant. A house = not so much.", detail:"Think of liquidity like a speed ranking. Cash in your bank? Instantly available. Stocks? You can sell them in seconds during market hours and have cash in a day or two. Your car? Takes a few weeks to sell. A house? Could take months. Your emergency fund should always be somewhere super liquid (like a savings account) because emergencies don't wait for you to sell your house.", cat:"Basics" },
  { term:"Amortization", simple:"How loan payments work: each month you pay the same amount, but over time more goes to actually paying off the debt.", detail:"Imagine your monthly payment is a pie. Early on, most of that pie is interest (the bank's profit) and only a tiny slice actually reduces what you owe. Over time, the slices flip — more goes to your actual debt and less to interest. This is why extra payments early in a loan are so powerful. Even $50 extra per month on a mortgage can save you tens of thousands in interest and shave years off the loan.", cat:"Debt" },
  { term:"Refinancing", simple:"Swapping your current loan for a new one with better terms — like upgrading to a cheaper phone plan.", detail:"If interest rates have dropped or your credit score has improved since you got your loan, you might qualify for a lower rate. It's like renegotiating your deal. Example: if your mortgage rate drops from 6.5% to 5.5%, you could save about $130 every month. There are usually some fees involved, so make sure the monthly savings add up to more than those fees within a year or two.", cat:"Debt" },
  { term:"Opportunity Cost", simple:"What you miss out on when you spend money one way instead of another.", detail:"Every dollar can only be spent once. If you use $50,000 to buy a car outright, that money can't also be invested. Had you invested it, in 10 years it could have grown to around $108,000. Does that mean never buy a car? Of course not! It just means being aware of the trade-off helps you make smarter choices. Sometimes the car is worth it. Sometimes investing part and financing the rest makes more sense.", cat:"Investing" },
  { term:"Risk Tolerance", simple:"How comfortable you are with your investments going up and down in value. Everyone's different!", detail:"Think of it like a rollercoaster. Some people love the thrill, others prefer the kiddie ride. If you're young and won't need the money for decades, you can handle more ups and downs because you have time to recover. If you're closer to needing the money, you want a smoother ride. The most important thing: pick a level where you won't panic and sell everything when the market drops 20-30%. That panic-selling is what actually loses people money.", cat:"Investing" },
  { term:"Tax-Loss Harvesting", simple:"A smart tax trick: sell investments that lost value to lower your tax bill, then buy something similar right away.", detail:"Here's how it works in plain English: Say you made $5,000 profit selling one investment but lost $3,000 on another. If you sell the loser, the government only taxes you on the $2,000 difference instead of the full $5,000. You then buy a similar (but not identical) investment so you stay invested. One rule: you have to wait 30 days before buying back the exact same thing. It's basically turning a loss into a tax discount.", cat:"Investing" },
  { term:"Asset Allocation", simple:"How you split your money between different types of investments — like dividing your plate between protein, veggies, and carbs.", detail:"Just like a balanced diet, a balanced portfolio spreads risk. A simple rule of thumb: subtract your age from 110 — that's roughly how much to put in stocks (the rest in bonds). So at 30, that's about 80% stocks, 20% bonds. Stocks grow more but bounce around. Bonds are calmer but grow less. Young? More stocks is fine because you have decades to ride out dips. Closer to retirement? More bonds to protect what you've built.", cat:"Investing" },
  { term:"Sinking Fund", simple:"Saving a little each month for something you know is coming — like putting aside birthday money all year for a big purchase.", detail:"Unlike emergency savings (for surprises), this is for stuff you KNOW is coming. Christmas gifts? Save $50/month starting in January so December doesn't hurt. Car insurance due yearly? Divide by 12 and save that monthly. It turns big scary bills into tiny easy payments. You'll never be stressed by a 'surprise' bill that actually wasn't a surprise at all.", cat:"Savings" },
  { term:"Debt Consolidation", simple:"Rolling all your different debts into one single payment — simpler to manage and sometimes cheaper.", detail:"Instead of juggling 5 different bills with 5 different due dates and interest rates, you take out one loan to pay them all off. Now you just have one payment. The goal is to get a lower overall interest rate. But watch out: a lower monthly payment sometimes means you're paying longer and more total interest. Make sure the math actually saves you money, and commit to not running up new debt on those freshly paid-off cards.", cat:"Debt" },
  { term:"Dollar Depreciation", simple:"When your country's money becomes worth less compared to other countries' money.", detail:"Imagine trading cards between schools. If your school's cards suddenly become less popular, you need to give more of yours to get one of theirs. Same with money between countries. If the dollar gets weaker, things from other countries cost more (like that European vacation getting pricier). But it also means stuff your country sells to others gets cheaper for them. Owning investments in different countries helps protect you if one country's money gets weaker.", cat:"Investing" },
];

const QUIZ_BANKS = {
  1: [
    [
      {q:"What does APR stand for?",opts:["Annual Percentage Rate","Average Payment Rate","Annual Payment Return","Applied Percentage Ratio"],correct:0},
      {q:"Which debt payoff method saves the most money?",opts:["Snowball","Avalanche","Paying minimums","Ignoring it"],correct:1},
      {q:"What is compound interest?",opts:["Interest on principal only","Interest earned on interest","A fixed fee","A loan type"],correct:1},
      {q:"How many months should an emergency fund cover?",opts:["1 month","3-6 months","12+ months","Doesn't matter"],correct:1},
      {q:"Net worth can be negative. When is this common?",opts:["Never","Early career with loans","When investing","When saving"],correct:1},
      {q:"What's the 50/30/20 rule?",opts:["50% needs, 30% wants, 20% save","50% save, 30% invest, 20% spend","50% wants, 30% needs, 20% debt","None of these"],correct:0},
      {q:"What is a minimum payment?",opts:["Total amount owed","Least you must pay monthly","Interest only","A one-time fee"],correct:1},
      {q:"What's a payment plan?",opts:["Paying everything at once","Monthly installments on a bill","A credit card type","A type of loan"],correct:1},
      {q:"Where should you keep your emergency fund?",opts:["Under the mattress","In stocks","In a savings account","In crypto"],correct:2},
      {q:"What happens if you only pay minimums on credit cards?",opts:["It's paid off fast","Takes decades, costs thousands extra","Nothing bad","Card is cancelled"],correct:1},
    ],
    [
      {q:"What does HYSA stand for?",opts:["High-Yield Savings Account","Home Yearly Savings Amount","Hybrid Yield System Account","High Year Stock Allocation"],correct:0},
      {q:"What's better: saving or paying off high-interest debt?",opts:["Always save first","Pay off high-interest debt first","They're equal","Neither matters"],correct:1},
      {q:"What's a good first financial goal?",opts:["Buy a car","Build an emergency fund","Invest in stocks","Get a credit card"],correct:1},
      {q:"What does 'living below your means' mean?",opts:["Being poor","Spending less than you earn","Never having fun","Only buying needs"],correct:1},
      {q:"What's the snowball method?",opts:["Save money in winter","Pay smallest debts first","Pay largest debts first","Ignore all debts"],correct:1},
      {q:"Your DTI should ideally be below:",opts:["10%","25%","36%","80%"],correct:2},
      {q:"What's a budget?",opts:["A restriction on fun","A plan for your money","A type of account","A government program"],correct:1},
      {q:"Interest on savings accounts is typically:",opts:["Paid by you","Paid to you by the bank","A penalty","Illegal"],correct:1},
      {q:"What does FDIC insured mean?",opts:["Your money is guaranteed by the government","Your investments always grow","Free money","Nothing important"],correct:0},
      {q:"Which costs more in interest: 5% or 20% APR?",opts:["5%","20%","They're the same","Depends on the day"],correct:1},
    ],
    [
      {q:"What percentage of income should go to needs (50/30/20)?",opts:["20%","30%","50%","70%"],correct:2},
      {q:"What is net worth?",opts:["Your salary","Assets minus debts","Your credit score","Your savings only"],correct:1},
      {q:"A HYSA typically offers what interest rate?",opts:["0.01%","0.5%","4-5%","15%"],correct:2},
      {q:"What's the first step in the avalanche method?",opts:["Pay smallest balance","Pay highest interest rate first","Pay all equally","Stop paying"],correct:1},
      {q:"What makes compound interest powerful?",opts:["High fees","Interest on interest over time","Government guarantees","Bank promotions"],correct:1},
      {q:"Emergency funds should be in what type of account?",opts:["Stocks","Checking only","Liquid savings account","Real estate"],correct:2},
      {q:"What does 'pay yourself first' mean?",opts:["Be selfish","Save before spending","Buy what you want","Quit your job"],correct:1},
      {q:"If you have $500 extra, what should you do first?",opts:["Invest in crypto","Build emergency fund if empty","Buy something nice","Lend to a friend"],correct:1},
      {q:"What's a credit score used for?",opts:["Measuring intelligence","Determining loan eligibility and rates","Your net worth","Your salary level"],correct:1},
      {q:"How often should you check your budget?",opts:["Never","Once a year","Monthly at minimum","Only when broke"],correct:2},
    ],
    [
      {q:"What's the main risk of no emergency fund?",opts:["Nothing","Going into debt for surprises","Lower credit score","Higher taxes"],correct:1},
      {q:"Savings rate means:",opts:["Bank's interest rate","% of income you save","Your total savings","Rate of spending"],correct:1},
      {q:"What's a good starter emergency fund?",opts:["$100","$500-$1,000","$50,000","$1 million"],correct:1},
      {q:"Which is a 'need' vs a 'want'?",opts:["Netflix = need","Rent = need","Dining out = need","New shoes = need"],correct:1},
      {q:"What does 'debt-free' mean?",opts:["You owe nothing","You have no savings","You don't use banks","You're retired"],correct:0},
      {q:"What's the danger of payday loans?",opts:["They're too slow","Extremely high interest rates","They improve credit","Nothing"],correct:1},
      {q:"Why automate savings?",opts:["Banks require it","Removes temptation to spend","It's illegal not to","For tax reasons"],correct:1},
      {q:"How does inflation affect savings?",opts:["Increases value","Decreases purchasing power over time","No effect","Makes debts disappear"],correct:1},
      {q:"What's a good habit for financial health?",opts:["Check accounts regularly","Ignore bills","Only use cash","Avoid all debt forever"],correct:0},
      {q:"What's the benefit of a budget?",opts:["Makes you rich instantly","Gives clarity and control over money","Eliminates all spending","Required by law"],correct:1},
    ],
  ],
  2: [
    [
      {q:"What does DCA mean in investing?",opts:["Daily Cash Allocation","Dollar-Cost Averaging","Debt Consolidation Agreement","Diversified Capital Assets"],correct:1},
      {q:"A DTI ratio above what % is considered risky?",opts:["10%","25%","36%","50%"],correct:2},
      {q:"Why are index funds popular?",opts:["Guaranteed returns","Low fees + diversification","Never lose value","Government backed"],correct:1},
      {q:"HYSA vs regular savings — main difference?",opts:["Insurance coverage","Interest rate (4-5% vs 0.5%)","Access speed","Minimum balance"],correct:1},
      {q:"What's a good savings rate?",opts:["5%","10%","20%+","Any amount"],correct:2},
      {q:"What is an ETF?",opts:["Emergency Transfer Fund","Exchange-Traded Fund","Extra Tax Filing","Equity Trust Fund"],correct:1},
      {q:"What does diversification mean?",opts:["Buying one stock","Spreading investments across types","Day trading","Only bonds"],correct:1},
      {q:"What's an expense ratio?",opts:["How much you invest","Annual fund fee as % of assets","Tax you pay","Return rate"],correct:1},
      {q:"Which investment is generally lowest risk?",opts:["Individual stocks","Cryptocurrency","Government bonds","Options trading"],correct:2},
      {q:"What does 'asset allocation' mean?",opts:["Buying assets","How you divide investments by type","Selling everything","Picking one stock"],correct:1},
    ],
    [
      {q:"The Rule of 72 helps you calculate:",opts:["Tax owed","Time to double money","Retirement age","Budget splits"],correct:1},
      {q:"What's a bear market?",opts:["Market going up","Market declining 20%+","Market for animals","A type of fund"],correct:1},
      {q:"Why is time important in investing?",opts:["It's not","Compound growth needs time","Markets only go up","For tax reasons"],correct:1},
      {q:"What's rebalancing a portfolio?",opts:["Selling everything","Adjusting back to target allocation","Only buying winners","Closing accounts"],correct:1},
      {q:"What does 'buy and hold' mean?",opts:["Buy a house","Invest and keep long-term","Day trade","Never sell anything"],correct:1},
      {q:"What's the typical long-term stock market return?",opts:["2-3%","5-6%","8-10%","25-30%"],correct:2},
      {q:"What's a dividend?",opts:["A fee you pay","Company's profit shared with shareholders","A type of bond","Government payment"],correct:1},
      {q:"What's the difference between stocks and bonds?",opts:["Same thing","Stocks = ownership, bonds = lending","Bonds are riskier","Stocks are guaranteed"],correct:1},
      {q:"What's market volatility?",opts:["Markets going up","How much prices fluctuate","A type of investment","Market closing"],correct:1},
      {q:"What should you NOT do in a market crash?",opts:["Stay calm","Keep investing","Panic sell everything","Review your plan"],correct:2},
    ],
    [
      {q:"What is a Roth IRA?",opts:["A type of stock","Retirement account with tax-free growth","A savings account","A government bond"],correct:1},
      {q:"What's dollar-cost averaging's main benefit?",opts:["Guarantees profit","Reduces timing risk","Eliminates fees","Doubles returns"],correct:1},
      {q:"What's a 401(k) match?",opts:["A game","Free money from employer","A tax penalty","A type of stock"],correct:1},
      {q:"Index funds vs active funds — which usually wins long-term?",opts:["Active funds","Index funds","They're equal","Neither"],correct:1},
      {q:"What's the S&P 500?",opts:["A savings account","Index of 500 large US companies","A single stock","A bank"],correct:1},
      {q:"What's 'tax-advantaged' mean?",opts:["You pay more tax","Account with tax benefits","Tax-free income","Illegal"],correct:1},
      {q:"How much should you invest monthly?",opts:["Nothing until rich","Whatever you can consistently","All your money","Only $10"],correct:1},
      {q:"What's the risk of not investing?",opts:["None","Inflation erodes purchasing power","You save more","Lower taxes"],correct:1},
      {q:"What does 'liquidity' mean?",opts:["Water investment","How easily you can access money","A type of bond","Stock price"],correct:1},
      {q:"Emergency fund: savings account or invested?",opts:["Always invested","Always in savings for quick access","In crypto","Under mattress"],correct:1},
    ],
    [
      {q:"What's a target-date fund?",opts:["A fund that expires","Auto-adjusts allocation as you age","Only for targets","A savings account"],correct:1},
      {q:"What percentage in bonds for a 30-year-old (rule of thumb)?",opts:["0%","20-30%","50%","80%"],correct:1},
      {q:"What's 'opportunity cost'?",opts:["Cost of opportunities","What you give up by choosing one option","A fee","Interest rate"],correct:1},
      {q:"Why avoid trying to time the market?",opts:["It's illegal","Missing best days destroys returns","It always works","Brokers don't allow it"],correct:1},
      {q:"What's a brokerage account?",opts:["A type of debt","Account for buying/selling investments","A savings account","A credit card"],correct:1},
      {q:"What are capital gains?",opts:["Investment losses","Profit from selling investments","Monthly dividends","Interest earned"],correct:1},
      {q:"What's the benefit of automatic investing?",opts:["Higher returns guaranteed","Consistency and discipline","Lower fees","Tax avoidance"],correct:1},
      {q:"What's inflation's long-term average?",opts:["0%","2-3%","10%","25%"],correct:1},
      {q:"Which matters more: timing the market or time in the market?",opts:["Timing","Time in the market","Neither","Both equally"],correct:1},
      {q:"What's a reasonable emergency fund for most people?",opts:["$100","$500","3-6 months expenses","$1 million"],correct:2},
    ],
  ],
  3: [
    [
      {q:"If you invest $200/mo at 8% for 30 years, roughly:",opts:["$72,000","$150,000","$300,000","$100,000"],correct:2},
      {q:"Which is NOT a snowball benefit?",opts:["Quick wins","Motivation","Saves most interest","Simple to follow"],correct:2},
      {q:"What's the Rule of 72?",opts:["Max retirement age","72÷rate = years to double","Tax limit","Investment minimum"],correct:1},
      {q:"In a bear market, generally:",opts:["Sell everything","Stay the course","Only buy bonds","Stop contributions"],correct:1},
      {q:"What does rebalancing mean?",opts:["Selling all stocks","Adjusting back to target allocation","Only buying winners","Closing accounts"],correct:1},
      {q:"Roth vs Traditional IRA — key difference?",opts:["Tax now vs tax later","They're the same","Roth is stocks only","Traditional has no limit"],correct:0},
      {q:"What's an expense ratio of 0.03%?",opts:["Very high","Very low and excellent","Average","Doesn't matter"],correct:1},
      {q:"What's tax-loss harvesting?",opts:["Losing money on purpose","Selling losers to offset gains tax","A farming technique","Illegal"],correct:1},
      {q:"Sequence of returns risk is most dangerous:",opts:["When young","Early in retirement","Never","When rates are low"],correct:1},
      {q:"What's the 4% rule?",opts:["Save 4% of income","Withdraw 4% of portfolio per year in retirement","Invest 4% in bonds","Pay 4% tax"],correct:1},
    ],
    [
      {q:"What's a bond yield?",opts:["Bond's color","Annual return as % of price","Bond's age","Issuer's name"],correct:1},
      {q:"What's the risk premium?",opts:["Insurance cost","Extra return for taking more risk","A penalty","Government fee"],correct:1},
      {q:"CAPE ratio measures:",opts:["Hat prices","Market valuation (price/10yr earnings)","Bond yields","GDP growth"],correct:1},
      {q:"What's dollar-weighted vs time-weighted return?",opts:["Same thing","Dollar = your actual return, time = fund performance","Dollar is always higher","Neither matters"],correct:1},
      {q:"What's a margin of safety?",opts:["Buying below intrinsic value","Using leverage","A type of bond","Account minimum"],correct:0},
      {q:"What causes most investors to underperform?",opts:["Bad funds","Emotional buying/selling","High fees","Low income"],correct:1},
      {q:"What's a backdoor Roth IRA?",opts:["Illegal method","Converting Traditional to Roth (high earners)","A savings account","Secret fund"],correct:1},
      {q:"Total stock market fund vs S&P 500 — main difference?",opts:["Completely different","Total market includes small/mid caps","S&P has more stocks","No difference"],correct:1},
      {q:"What's Monte Carlo simulation in finance?",opts:["Gambling","Running thousands of scenarios for retirement planning","A type of fund","Casino investing"],correct:1},
      {q:"What's the efficient frontier?",opts:["Best border","Optimal risk/return portfolio combinations","Cheapest stocks","Fastest trading"],correct:1},
    ],
    [
      {q:"What's leverage in investing?",opts:["A tool","Using borrowed money to amplify returns/losses","A type of stock","A safe strategy"],correct:1},
      {q:"What's a covered call?",opts:["Insurance","Selling call option on stock you own","Buying stocks","A type of bond"],correct:1},
      {q:"Real return vs nominal return:",opts:["Same thing","Real = after inflation, nominal = before","Real is always higher","Neither matters"],correct:1},
      {q:"What's the yield curve?",opts:["A road","Graph of bond yields by maturity","Stock chart","Savings rate over time"],correct:1},
      {q:"An inverted yield curve often signals:",opts:["Bull market","Potential recession","Higher stock prices","Nothing"],correct:1},
      {q:"What's a SPAC?",opts:["Space stock","Blank check company for acquisitions","A type of bond","Savings account"],correct:1},
      {q:"What's the difference between alpha and beta?",opts:["Same thing","Alpha = excess return, beta = market sensitivity","Greek letters only","Neither matters"],correct:1},
      {q:"What's a fiduciary?",opts:["A type of fund","Advisor legally required to act in your interest","A government role","A bank account"],correct:1},
      {q:"What's the biggest threat to long-term wealth building?",opts:["Market crashes","Not investing at all","Low interest rates","High taxes"],correct:1},
      {q:"What's the Sharpe ratio?",opts:["A knife metric","Risk-adjusted return measure","Stock price ratio","Bond yield"],correct:1},
    ],
    [
      {q:"What's a safe withdrawal rate in retirement?",opts:["10%","3-4%","1%","7%"],correct:1},
      {q:"What's systematic risk vs unsystematic risk?",opts:["Same","Systematic=market-wide, unsystematic=company-specific","Systematic is avoidable","Neither is real"],correct:1},
      {q:"Why might you hold international stocks?",opts:["They always outperform","Diversification across economies","Required by law","Lower fees"],correct:1},
      {q:"What's a glide path in target-date funds?",opts:["A ski slope","Gradual shift from stocks to bonds over time","Fixed allocation","A type of return"],correct:1},
      {q:"What's the disposition effect?",opts:["Selling winners too early, holding losers too long","Good investing","A type of fund","Tax strategy"],correct:0},
      {q:"What does mean reversion suggest?",opts:["Markets go to zero","Extreme returns tend to normalize over time","Stocks always go up","Bonds beat stocks"],correct:1},
      {q:"What's the role of bonds in a portfolio?",opts:["Maximum growth","Stability and income during volatility","No role anymore","Only for retirees"],correct:1},
      {q:"Tax drag refers to:",opts:["Filing taxes","How taxes reduce investment returns over time","A type of fund","Government policy"],correct:1},
      {q:"What's the main advantage of tax-deferred accounts?",opts:["No taxes ever","Compound growth without annual tax drag","Higher returns","Government guarantees"],correct:1},
      {q:"Why is behavioral finance important?",opts:["It's not","Understanding biases helps make better decisions","It predicts stock prices","For academics only"],correct:1},
    ],
  ],
};

function Learn({ onAcademyUnlock, academyUnlocked, cleanMode, onQuizComplete }) {
  const [quizActive, setQuizActive] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [quizDone, setQuizDone] = useState(false);
  const [level, setLevel] = useState(1);
  const [activeLevel, setActiveLevel] = useState(1);
  const [quizVariant, setQuizVariant] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [history, setHistory] = useState([]);
  const [expandedTerm, setExpandedTerm] = useState(null);

  const questions = useMemo(() => {
    const bank = QUIZ_BANKS[activeLevel] || QUIZ_BANKS[1];
    return bank[quizVariant % bank.length];
  }, [activeLevel, quizVariant]);

  const answerQ = (idx) => {
    if (answered !== null) return;
    setAnswered(idx);
    if (idx === questions[qIdx].correct) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 < questions.length) { setQIdx(qIdx + 1); setAnswered(null); }
      else {
        const fs = score + (idx === questions[qIdx].correct ? 1 : 0);
        const pct = Math.round((fs/questions.length)*100);
        setQuizDone(true);
        if (onQuizComplete) {
          const tempH = [...history, { score:fs, total:questions.length, pct, level:activeLevel, variant:quizVariant }];
          const tempLvlH = tempH.filter(r => r.level === activeLevel);
          const tempDone = new Set(tempLvlH.map(r => r.variant));
          const remaining = 4 - tempDone.size;
          const willLevel = tempDone.size >= 4 && [0,1,2,3].map(v => Math.max(0,...tempLvlH.filter(r=>r.variant===v).map(r=>r.pct))).reduce((a,b)=>a+b,0)/4 >= 70;
          onQuizComplete({ pct: pct, remaining: Math.max(0, remaining), leveledUp: willLevel, level: activeLevel });
        }
        setHistory(h => {
          const nh = [...h, { score:fs, total:questions.length, pct, level:activeLevel, variant:quizVariant }];
          const lvlH = nh.filter(r => r.level === activeLevel);
          const doneVariants = new Set(lvlH.map(r => r.variant));
          if (doneVariants.size >= 4) {
            const bests = [0,1,2,3].map(v => Math.max(0,...lvlH.filter(r=>r.variant===v).map(r=>r.pct)));
            const avg = bests.reduce((a,b)=>a+b,0)/4;
            if (avg >= 70 && activeLevel >= level) setLevel(Math.min(3, activeLevel + 1));
            // Check for 100% mastery across all levels for academy unlock
            const allLvlDone = [1,2,3].every(lv => {
              const lvH = nh.filter(r => r.level === lv);
              const vSet = new Set(lvH.map(r => r.variant));
              if (vSet.size < 4) return false;
              const bests = [0,1,2,3].map(v => Math.max(0,...lvH.filter(r=>r.variant===v).map(r=>r.pct)));
              return bests.every(p => p >= 70);
            });
            if (allLvlDone && onAcademyUnlock) onAcademyUnlock();
          }
          return nh;
        });
      }
    }, 1200);
  };

  const startQuiz = (v) => { setQuizVariant(v); setQuizActive(true); setQIdx(0); setScore(0); setAnswered(null); setQuizDone(false); };
  const resetQuiz = () => { setQuizActive(false); setQuizDone(false); setQIdx(0); setScore(0); setAnswered(null); };
  const filteredTerms = TERMS.filter(t => !searchTerm || t.term.toLowerCase().includes(searchTerm.toLowerCase()) || t.cat.toLowerCase().includes(searchTerm.toLowerCase()));
  const cats = [...new Set(TERMS.map(t => t.cat))];
  const quizPct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const badges = [{lv:1,ic:"🌱",l:"Beginner",c:"#38bdf8"},{lv:2,ic:"📊",l:"Intermediate",c:"#fbbf24"},{lv:3,ic:"🏆",l:"Expert",c:"#6ee7b7"}];
  const quizGrade = quizPct >= 90 ? {l:"Amazing",c:"#6ee7b7",i:"🏆",msg:"You really know your stuff!"} : quizPct >= 70 ? {l:"Solid",c:"#34d399",i:"💪",msg:"Great foundation! Keep building."} : quizPct >= 50 ? {l:"Growing",c:"#fbbf24",i:"📚",msg:"Good start! Review and try again."} : {l:"Keep Learning",c:"#38bdf8",i:"🌱",msg:"Everyone starts here. Read the glossary!"};
  const inQuiz = quizActive || quizDone;

  return (<div>
    <div style={{ fontSize:18,fontWeight:700,color:"#e2e8f0",marginBottom:4 }}>Learn Financial Concepts</div>
    <div style={{ fontSize:12,color:"#475569",marginBottom:20 }}>{!cleanMode&&"Simple explanations + adaptive quizzes with 4 variations per level."}</div>
    {/* Level badges */}
    {!cleanMode&&<div style={{ display:"flex",gap:8,marginBottom:16 }}>{badges.map(b => (<div key={b.lv} style={{ flex:1,padding:10,borderRadius:10,background:level>=b.lv?`${b.c}08`:"rgba(255,255,255,0.02)",border:`1px solid ${level>=b.lv?`${b.c}20`:"rgba(255,255,255,0.04)"}`,textAlign:"center",opacity:level>=b.lv?1:0.3,transition:"all 0.5s" }}><div style={{ fontSize:22 }}>{b.ic}</div><div style={{ fontSize:10,fontWeight:600,color:level>=b.lv?b.c:"#475569" }}>{b.l}</div><div style={{ fontSize:8,color:"#475569" }}>Level {b.lv}</div></div>))}</div>}
    <div style={{ display:"grid",gridTemplateColumns:inQuiz?"1fr":"1fr 1fr",gap:16 }}>
      {/* Glossary - hidden during quiz */}
      {!inQuiz&&<Card>
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:12 }}>📖 Glossary</div>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search terms..." style={{ width:"100%",padding:"8px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e2e8f0",fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:12,boxSizing:"border-box" }} />
        <div style={{ maxHeight:460,overflowY:"auto" }}>
          {cats.map(cat => { const items = filteredTerms.filter(t => t.cat === cat); if (!items.length) return null; return (<div key={cat} style={{ marginBottom:12 }}>
            <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:6 }}>{cat}</div>
            {items.map((t,i) => (<div key={i} onClick={() => !cleanMode&&setExpandedTerm(expandedTerm===t.term?null:t.term)} style={{ padding:10,marginBottom:4,borderRadius:8,background:expandedTerm===t.term?"rgba(110,231,183,0.04)":"rgba(255,255,255,0.02)",border:expandedTerm===t.term?"1px solid rgba(110,231,183,0.12)":"1px solid rgba(255,255,255,0.04)",cursor:"pointer",transition:"all 0.2s" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:12,fontWeight:600,color:"#e2e8f0" }}>{t.term}</div>
                <span style={{ fontSize:10,color:"#475569",transform:expandedTerm===t.term?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s" }}>▼</span>
              </div>
              <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5,marginTop:4 }}>{t.simple}</div>
              {expandedTerm===t.term&&<div style={{ fontSize:11,color:"#6ee7b7",lineHeight:1.6,marginTop:8,padding:10,background:"rgba(110,231,183,0.04)",borderRadius:8 }}>{t.detail}</div>}
            </div>))}
          </div>); })}
        </div>
      </Card>}
      {/* Quiz */}
      <Card>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0" }}>🧩 Knowledge Quiz</div>
          <span style={{ fontSize:9,color:"#64748b",background:"rgba(255,255,255,0.06)",padding:"2px 8px",borderRadius:4 }}>Unlocked: {level}/3</span>
        </div>
        {!quizActive && !quizDone ? (
          <div style={{ textAlign:"center",padding:20 }}>
            <div style={{ fontSize:36,marginBottom:8 }}>🧠</div>
            <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:8 }}>Choose a Quiz</div>
            <div style={{ display:"flex",gap:6,marginBottom:12 }}>{[1,2,3].map(lv => {
              const unlocked = lv <= level;
              return (<button key={lv} onClick={() => unlocked && setActiveLevel(lv)} style={{ flex:1,padding:"8px 0",borderRadius:8,border:activeLevel===lv?"1px solid #a78bfa":"1px solid rgba(255,255,255,0.06)",background:activeLevel===lv?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.02)",color:unlocked?(activeLevel===lv?"#a78bfa":"#94a3b8"):"#333",fontSize:11,fontWeight:600,cursor:unlocked?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",opacity:unlocked?1:0.4 }}>{lv===1?"🌱 Beginner":lv===2?"📊 Intermediate":"🏆 Expert"}{!unlocked?" 🔒":""}</button>);
            })}</div>
            <div style={{ fontSize:11,color:"#94a3b8",marginBottom:12 }}>4 variations per level · 10 questions each · Complete all 4 with 70% avg to unlock next level</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {[0,1,2,3].map(v => {
                const taken = history.some(h => h.level===activeLevel && h.variant===v);
                const best = history.filter(h => h.level===activeLevel && h.variant===v).reduce((b,h) => Math.max(b,h.pct), 0);
                return (<button key={v} onClick={() => startQuiz(v)} style={{ padding:14,borderRadius:10,border:taken?"1px solid rgba(110,231,183,0.15)":"1px solid rgba(255,255,255,0.08)",background:taken?"rgba(110,231,183,0.04)":"rgba(255,255,255,0.03)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"center" }}>
                  <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>Quiz {v+1}</div>
                  {taken?<div style={{ fontSize:10,color:"#6ee7b7",marginTop:2 }}>Best: {best}%</div>:<div style={{ fontSize:10,color:"#475569",marginTop:2 }}>Not taken</div>}
                </button>);
              })}
            </div>
          </div>
        ) : quizDone ? (
          <div style={{ textAlign:"center",padding:16 }}>
            <div style={{ fontSize:40,marginBottom:6 }}>{quizGrade.i}</div>
            <div style={{ fontSize:24,fontWeight:800,color:quizGrade.c }}>{score}/{questions.length}</div>
            <div style={{ fontSize:13,fontWeight:600,color:quizGrade.c,marginBottom:4 }}>{quizGrade.l}</div>
            <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.6,marginBottom:12 }}>{quizGrade.msg}</div>
            <MiniBar value={score} max={questions.length} color={quizGrade.c} height={10} />
            <div style={{ display:"flex",gap:8,justifyContent:"center",marginTop:12 }}>
              <Btn onClick={() => startQuiz(quizVariant)} small>Retry</Btn>
              <button onClick={resetQuiz} style={{ padding:"8px 16px",borderRadius:8,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:"#e2e8f0",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}><span style={{ fontSize:11,color:"#64748b" }}>Q{qIdx+1}/{questions.length}</span><span style={{ fontSize:11,fontWeight:600,color:"#6ee7b7" }}>Score: {score}</span></div>
            <MiniBar value={qIdx+1} max={questions.length} color="#a78bfa" height={4} />
            <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginTop:14,marginBottom:14,lineHeight:1.5 }}>{questions[qIdx]?.q}</div>
            <div style={{ display:"grid",gap:6 }}>
              {questions[qIdx]?.opts.map((opt,i) => {
                const isC = i === questions[qIdx].correct; const isS = answered === i;
                return (<button key={i} onClick={() => answerQ(i)} style={{ padding:"11px 14px",borderRadius:10,background:answered!==null?(isC?"rgba(110,231,183,0.1)":isS?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.02)"):"rgba(255,255,255,0.03)",border:`1px solid ${answered!==null?(isC?"rgba(110,231,183,0.25)":isS?"rgba(248,113,113,0.25)":"rgba(255,255,255,0.04)"):"rgba(255,255,255,0.08)"}`,color:answered!==null?(isC?"#6ee7b7":isS?"#f87171":"#64748b"):"#e2e8f0",fontSize:12,fontWeight:500,cursor:answered!==null?"default":"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left" }}>{opt}</button>);
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
    {/* Progress */}
    {academyUnlocked && <Card style={{ marginTop:16,background:"linear-gradient(135deg,rgba(251,191,36,0.06),rgba(167,139,250,0.06))",border:"1px solid rgba(251,191,36,0.15)" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ fontSize:32 }}>🎓</div>
        <div><div style={{ fontSize:14,fontWeight:700,color:"#fbbf24" }}>Investing Academy Unlocked!</div><div style={{ fontSize:11,color:"#94a3b8" }}>You've mastered all levels. Check the new Academy tab for advanced content.</div></div>
      </div>
    </Card>}
    {history.length > 0 && !cleanMode && <Card style={{ marginTop:16 }}>
      <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:18 }}>📈 Your Journey</div>
      <div style={{ display:"flex",gap:6,alignItems:"flex-end",height:70,marginBottom:8,padding:"0 4px" }}>
        {history.slice(-12).map((h,i) => (<div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
          <div style={{ width:"100%",height:`${Math.max(h.pct*0.55,6)}px`,background:h.pct>=70?"linear-gradient(to top,rgba(110,231,183,0.3),rgba(110,231,183,0.6))":"linear-gradient(to top,rgba(251,191,36,0.2),rgba(251,191,36,0.4))",borderRadius:4,transition:"height 0.5s" }} />
          <div style={{ fontSize:9,fontWeight:700,color:h.pct>=70?"#6ee7b7":"#fbbf24" }}>{h.pct}%</div>
          <div style={{ fontSize:7,color:"#475569" }}>L{h.level}</div>
        </div>))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",padding:"4px 8px",background:"rgba(255,255,255,0.02)",borderRadius:6 }}>
        <span>{history.length} quiz{history.length>1?"zes":""} taken</span>
        <span>Best: {Math.max(...history.map(h=>h.pct))}%</span>
        <span>Current level: {level}/3</span>
      </div>
    </Card>}
  </div>);
}


// ═══ INVESTING ACADEMY (Secret unlockable) ═══
const ACADEMY_TERMS = [
  { term:"Efficient Market Hypothesis", simple:"The theory that stock prices reflect all available information, making it hard to consistently beat the market.", detail:"EMH comes in three forms: weak (past prices can't predict future), semi-strong (public info is priced in), strong (even insider info is priced in). If markets are efficient, index funds are the optimal strategy. Most evidence supports semi-strong form, which is why even professional fund managers rarely beat index funds over long periods.", cat:"Theory" },
  { term:"Modern Portfolio Theory", simple:"A framework for building portfolios that maximize return for a given level of risk through diversification.", detail:"Developed by Harry Markowitz in 1952. Key insight: it's not just individual asset risk that matters, but how assets move relative to each other (correlation). By combining assets with low correlation, you can reduce portfolio risk without sacrificing returns. This is why holding both stocks and bonds is better than either alone — they often move in opposite directions.", cat:"Theory" },
  { term:"CAPE Ratio (Shiller P/E)", simple:"Cyclically Adjusted Price-to-Earnings ratio — compares stock price to 10 years of averaged earnings to assess market valuation.", detail:"Created by Nobel laureate Robert Shiller. Historical average is ~17. Above 25 suggests overvaluation, below 15 suggests undervaluation. The CAPE was above 30 before the 2000 dot-com crash and 2008 financial crisis. However, some argue permanently higher CAPEs are justified by low interest rates and tech productivity gains. Useful as a long-term indicator, not for timing.", cat:"Analysis" },
  { term:"Alpha and Beta", simple:"Alpha = returns above what's expected for the risk taken. Beta = how much an investment moves with the market.", detail:"Beta of 1.0 = moves exactly with the market. Beta 1.5 = 50% more volatile than market. Beta 0.5 = half as volatile. Alpha is the 'excess return' — a fund with positive alpha beat its benchmark after adjusting for risk. Most active managers have negative alpha after fees. This is the core argument for passive indexing.", cat:"Analysis" },
  { term:"Sharpe Ratio", simple:"Measures risk-adjusted return — how much extra return you get per unit of risk (volatility).", detail:"Formula: (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation. Higher is better. Above 1.0 is good, above 2.0 is very good. It helps compare investments with different risk levels. A fund returning 12% with 20% volatility (Sharpe 0.5) is worse risk-adjusted than one returning 8% with 8% volatility (Sharpe 0.75).", cat:"Analysis" },
  { term:"Monte Carlo Simulation", simple:"Running thousands of random scenarios to estimate the probability of different investment outcomes.", detail:"Instead of assuming a single return rate, Monte Carlo uses historical distribution of returns (including crashes and booms) to simulate 10,000+ possible futures. It might show: 85% chance your portfolio lasts through retirement, 50% chance it exceeds $2M, 5% chance it runs out by age 80. This is far more realistic than simple compound interest calculators.", cat:"Planning" },
  { term:"Sequence of Returns Risk", simple:"The danger that poor market returns early in retirement can devastate a portfolio, even if long-term averages are fine.", detail:"Two retirees with identical 30-year average returns of 7% can have vastly different outcomes depending on order. Bad returns in years 1-5 of retirement (while withdrawing) can permanently impair the portfolio. Mitigation strategies: bucket strategy (2-3 years cash), flexible spending, guardrails approach, and partial annuitization.", cat:"Planning" },
  { term:"Safe Withdrawal Rate", simple:"The percentage you can withdraw from retirement savings annually with high confidence of not running out. Usually 3-4%.", detail:"The '4% rule' comes from the Trinity Study (1998) showing that withdrawing 4% of initial portfolio value (adjusted for inflation) survived 95% of 30-year periods historically. Recent research suggests 3.3-3.5% may be safer given current valuations and longer retirements. Dynamic withdrawal strategies (spending more in good years, less in bad) can increase safe rates to 4.5-5%.", cat:"Planning" },
  { term:"Factor Investing", simple:"Targeting specific characteristics (factors) that historically drive higher returns: value, size, momentum, quality.", detail:"Academic research identifies several 'factors' that explain stock returns beyond market risk. Value (cheap stocks outperform expensive), Size (small caps outperform large caps), Momentum (recent winners continue winning), Quality (profitable companies outperform). Factor ETFs like VLUE, SCHA, MTUM target these. Factor premiums are cyclical — they can underperform for years before paying off.", cat:"Advanced" },
  { term:"Options Basics", simple:"Contracts giving the right (not obligation) to buy or sell an asset at a set price by a certain date.", detail:"Call option = right to buy at strike price. Put option = right to sell at strike price. Covered calls: sell calls on stocks you own to generate income (caps upside). Protective puts: buy puts as insurance against drops. Options are complex instruments — most beginners lose money. Only consider after mastering fundamentals and never risk more than 5% of portfolio.", cat:"Advanced" },
  { term:"Tax-Advantaged Accounts", simple:"Accounts with special tax benefits: 401(k), IRA, Roth IRA, HSA. Use these before taxable accounts.", detail:"Order of priority: 1) 401(k) up to employer match (free money), 2) HSA if eligible (triple tax advantage), 3) Roth IRA ($7,000/yr limit), 4) Max 401(k) ($23,500/yr), 5) Taxable brokerage. Roth = pay tax now, grow tax-free. Traditional = deduct now, pay tax on withdrawal. At lower income, Roth is usually better. At higher income, Traditional may save more.", cat:"Planning" },
  { term:"Rebalancing", simple:"Periodically adjusting your portfolio back to its target allocation by selling winners and buying laggards.", detail:"If your target is 80/20 stocks/bonds and stocks surge to 90/10, rebalancing means selling stocks and buying bonds. This enforces 'buy low, sell high' discipline. Methods: calendar-based (annually), threshold-based (when allocation drifts 5%+), or on contributions (direct new money to underweight assets). Tax-efficient rebalancing uses new contributions and tax-advantaged accounts first.", cat:"Advanced" },
];

const ACADEMY_QUIZZES = [
  [
    {q:"What does the Efficient Market Hypothesis suggest about stock picking?",opts:["It's easy to beat the market","It's very difficult to consistently outperform","Markets are always wrong","Only insiders can profit"],correct:1},
    {q:"What does a beta of 1.5 mean?",opts:["50% less volatile than market","Exactly tracks the market","50% more volatile than market","No correlation to market"],correct:2},
    {q:"The 4% rule refers to:",opts:["Annual savings target","Safe retirement withdrawal rate","Investment return goal","Tax rate on gains"],correct:1},
    {q:"What is sequence of returns risk?",opts:["Risk of bad returns early in retirement","Risk of inflation","Risk of market crash","Risk of outliving savings"],correct:0},
    {q:"Monte Carlo simulation in finance:",opts:["Is a gambling strategy","Runs thousands of scenarios for planning","Predicts exact returns","Is only for professionals"],correct:1},
    {q:"What order should you fund accounts?",opts:["Taxable first","401k match → HSA → Roth → Max 401k → Taxable","All in Roth","Savings account only"],correct:1},
    {q:"Factor investing targets characteristics like:",opts:["Only company size","Value, momentum, quality, size","Only tech stocks","Random selection"],correct:1},
    {q:"A Sharpe ratio above 1.0 indicates:",opts:["Poor performance","Good risk-adjusted returns","High risk","Low returns"],correct:1},
    {q:"When should you rebalance?",opts:["Never","When allocation drifts from target","Only when market crashes","Every day"],correct:1},
    {q:"Covered calls involve:",opts:["Buying options on stocks you don't own","Selling call options on stocks you own","A type of bond","Insurance on your house"],correct:1},
  ],
  [
    {q:"Modern Portfolio Theory's key insight is:",opts:["Buy one stock","Correlation between assets matters for risk","Bonds always beat stocks","Timing the market"],correct:1},
    {q:"CAPE ratio historical average is roughly:",opts:["5","17","35","50"],correct:1},
    {q:"Positive alpha means a fund:",opts:["Lost money","Beat its benchmark after risk adjustment","Matched the market","Had high fees"],correct:1},
    {q:"Why might a 3.5% withdrawal rate be safer than 4%?",opts:["It's not","Current high valuations and longer retirements","Government requires it","It earns more"],correct:1},
    {q:"Tax-loss harvesting works by:",opts:["Losing money on purpose","Selling losers to offset gains, reinvesting in similar assets","Avoiding all taxes","Only selling winners"],correct:1},
    {q:"HSA has 'triple tax advantage' meaning:",opts:["Three types of accounts","Tax-free contribution, growth, AND withdrawal for medical","Three times the returns","Tax at three rates"],correct:1},
    {q:"Factor premiums are:",opts:["Guaranteed","Cyclical — can underperform for years","Always positive","Only for experts"],correct:1},
    {q:"Dynamic withdrawal strategies can:",opts:["Guarantee income","Increase safe withdrawal to 4.5-5% by adjusting spending","Eliminate market risk","Double your money"],correct:1},
    {q:"Options are best described as:",opts:["Simple investments for everyone","Complex instruments — most beginners lose money","Guaranteed income","Risk-free"],correct:1},
    {q:"Rebalancing enforces:",opts:["Buy high, sell low","Buy low, sell high discipline","Only buying stocks","Never selling"],correct:1},
  ],
];

function InvestingAcademy({ income, expenses, debts, savings, emergency, investments, cleanMode }) {
  const [view, setView] = useState("glossary");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTerm, setExpandedTerm] = useState(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [qI, setQI] = useState(0);
  const [sc, setSc] = useState(0);
  const [ans, setAns] = useState(null);
  const [done, setDone] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [strategyMode, setStrategyMode] = useState("smart");

  const qs = ACADEMY_QUIZZES[quizIdx] || ACADEMY_QUIZZES[0];
  const ft = ACADEMY_TERMS.filter(t => !searchTerm || t.term.toLowerCase().includes(searchTerm.toLowerCase()) || t.cat.toLowerCase().includes(searchTerm.toLowerCase()));
  const cats = [...new Set(ACADEMY_TERMS.map(t => t.cat))];
  const toggleCheck = (key) => setCheckedSteps(prev => ({...prev, [key]: !prev[key]}));

  const answerAQ = (idx) => {
    if (ans !== null) return;
    setAns(idx);
    if (idx === qs[qI].correct) setSc(s => s + 1);
    setTimeout(() => { if (qI + 1 < qs.length) { setQI(qI + 1); setAns(null); } else setDone(true); }, 1000);
  };
  const resetAQ = () => { setQI(0); setSc(0); setAns(null); setDone(false); };

  // Smart strategy analysis
  const te = expenses?.reduce((s,e) => s+e.amount, 0) || 0;
  const td = debts?.reduce((s,d) => s+d.balance, 0) || 0;
  const emergPct = emergency?.target > 0 ? emergency.saved / emergency.target : 0;
  const hasHighDebt = td > income * 6;
  const hasInvestments = investments?.length > 0;
  const savingsRate = income > 0 ? ((income - te) / income * 100) : 0;

  const smartSteps = (() => {
    const steps = [];
    if (emergPct < 1) steps.push({ id:"emerg", text:`Build your emergency fund to ${formatCurrency(emergency?.target||0)} (currently ${(emergPct*100).toFixed(0)}% there)`, why:"A safety net stops you from going into debt when surprises happen. This is always step 1.", done: emergPct >= 1 });
    else steps.push({ id:"emerg", text:"Emergency fund is fully funded!", why:"Your safety net is solid. Great foundation.", done:true });
    if (hasHighDebt) steps.push({ id:"debt", text:`Pay down high-interest debt (${formatCurrency(td)} remaining)`, why:"High-interest debt grows fast. Paying it off is like earning a guaranteed return equal to the interest rate.", done: td === 0 });
    else if (td > 0) steps.push({ id:"debt", text:`Continue paying off ${formatCurrency(td)} in debt`, why:"Your debt is manageable but still worth eliminating to free up cash flow.", done: td === 0 });
    else steps.push({ id:"debt", text:"You're debt free!", why:"No debt means every dollar works for you.", done:true });
    if (!hasInvestments) steps.push({ id:"invest", text:"Start investing — even $50/month in an index fund", why:"Time in the market is your biggest advantage. Starting small is infinitely better than not starting.", done:false });
    else steps.push({ id:"invest", text:`Keep investing (currently ${formatCurrency(investments.reduce((s,i)=>s+i.monthlyContribution,0))}/mo)`, why:"Consistency beats timing. Your regular contributions are building real wealth.", done:true });
    if (savingsRate < 20) steps.push({ id:"save", text:`Increase savings rate from ${savingsRate.toFixed(0)}% to 20%+`, why:"Every 1% increase in savings rate accelerates your path to financial freedom.", done: savingsRate >= 20 });
    else steps.push({ id:"save", text:`Savings rate is ${savingsRate.toFixed(0)}% — excellent!`, why:"You're saving more than most. This compounds massively over time.", done:true });
    steps.push({ id:"diversify", text:"Diversify across asset types and geographies", why:"Don't put all eggs in one basket. Mix stocks, bonds, and international exposure.", done: investments?.length >= 2 });
    steps.push({ id:"tax", text:"Use tax-advantaged accounts (401k, Roth IRA) before taxable", why:"Tax-advantaged accounts let your money grow without the government taking a slice each year.", done: false });
    const basicDone = steps.filter(s => s.done).length;
    if (basicDone >= 4) {
      steps.push({ id:"s_rebal", text:"Rebalance your portfolio to stay on target", why:"Investments drift over time. A quick yearly check-up keeps your risk where you want it.", done:false });
      steps.push({ id:"s_fees", text:"Check all investment fees — switch if above 0.2%", why:"Fees quietly eat returns. Saving 0.5% in fees could mean tens of thousands more over your lifetime.", done:false });
      steps.push({ id:"s_intl", text:"Add international diversification to your portfolio", why:"No country wins every decade. Spreading globally protects against regional downturns.", done:false });
    }
    if (basicDone >= 6) {
      steps.push({ id:"s_taxh", text:"Look into tax-loss harvesting opportunities", why:"Turn investment losses into tax savings — it's like finding money hiding in your portfolio.", done:false });
      steps.push({ id:"s_benef", text:"Set beneficiary designations on all accounts", why:"Takes 10 minutes. Ensures your money goes exactly where you want, no matter what.", done:false });
      steps.push({ id:"s_auto", text:"Automate all savings, investing, and bill payments", why:"The less you think about it, the more consistent you'll be. Automation beats willpower.", done:false });
    }
    return steps;
  })();

  const strategies = {
    smart: { label:"🧠 Smart (Your Situation)", steps: smartSteps, color:"#fbbf24" },
    beginner: { label:"🌱 Beginner", steps:[
      {id:"b1",text:"Save $1,000 as a starter emergency fund",why:"Even a small cushion prevents most money emergencies from becoming debt.",done:false},
      {id:"b2",text:"Get employer 401(k) match — it's free money",why:"If your employer matches 3%, that's an instant 100% return. Never leave free money on the table.",done:false},
      {id:"b3",text:"Pay off all high-interest debt (above 7%)",why:"Paying off a 20% credit card is like earning 20% guaranteed. No investment beats that.",done:false},
      {id:"b4",text:"Build full 3-6 month emergency fund",why:"Job loss, medical bills, car trouble — this fund means you never go backwards.",done:false},
      {id:"b5",text:"Open a Roth IRA and invest in a target-date fund",why:"One fund that automatically adjusts as you age. Set it and forget it. The simplest way to start.",done:false},
      {id:"b6",text:"Automate everything — set up monthly auto-transfers",why:"You can't spend what you don't see. Automation removes willpower from the equation.",done:false},
    ], color:"#38bdf8" },
    intermediate: { label:"📊 Intermediate", steps:[
      {id:"i1",text:"Max out Roth IRA ($7,000/year)",why:"Tax-free growth for decades. The earlier you max this, the more powerful it becomes.",done:false},
      {id:"i2",text:"Increase 401(k) contributions toward the max",why:"$23,500/year limit. Every extra dollar reduces your tax bill today AND grows tax-deferred.",done:false},
      {id:"i3",text:"Set a target asset allocation (e.g., 80/20 stocks/bonds)",why:"Having a plan prevents emotional decisions. Decide your risk level when you're calm, not during a crash.",done:false},
      {id:"i4",text:"Add international diversification (20-40% of stocks)",why:"The US won't always be the top performer. International exposure protects against geographic risk.",done:false},
      {id:"i5",text:"Rebalance your portfolio annually",why:"Selling winners and buying laggards sounds wrong but it's a built-in 'buy low, sell high' system.",done:false},
      {id:"i6",text:"Build taxable brokerage account for extra savings",why:"Once tax-advantaged accounts are full, a regular account gives you flexibility with no withdrawal restrictions.",done:false},
    ], color:"#a78bfa" },
    advanced: { label:"🏆 Advanced", steps:[
      {id:"a1",text:"Implement tax-loss harvesting strategy",why:"Turn investment losses into tax savings. It's like getting a discount on your tax bill.",done:false},
      {id:"a2",text:"Consider factor tilts (value, small-cap)",why:"Historically these earn slightly more over very long periods, but require patience through dry spells.",done:false},
      {id:"a3",text:"Plan withdrawal strategy for retirement",why:"The order you pull from accounts (taxable → traditional → Roth) can save hundreds of thousands in taxes.",done:false},
      {id:"a4",text:"Review and optimize all expense ratios",why:"Even 0.1% less in fees compounds to thousands over decades. Every basis point matters.",done:false},
      {id:"a5",text:"Consider Roth conversion strategy in low-income years",why:"Converting traditional to Roth when your income is low means paying less tax on the conversion.",done:false},
      {id:"a6",text:"Create an estate plan and beneficiary designations",why:"Make sure your wealth goes where you want. Beneficiary designations override wills.",done:false},
    ], color:"#6ee7b7" },
  };

  const currentStrat = strategies[strategyMode];
  const stratChecked = currentStrat.steps.filter(s => s.done || checkedSteps[s.id]).length;
  const stratPct = currentStrat.steps.length > 0 ? (stratChecked / currentStrat.steps.length) * 100 : 0;
  const stratMsg = stratPct >= 100 ? {t:"All steps complete! You're crushing it!",i:"🎉",c:"#6ee7b7"} : stratPct >= 75 ? {t:"Almost there! Just a few more steps!",i:"💪",c:"#34d399"} : stratPct >= 50 ? {t:"Halfway through — great momentum!",i:"⚡",c:"#fbbf24"} : stratPct > 0 ? {t:"Good start! Keep checking off steps.",i:"📈",c:"#38bdf8"} : {t:"Let's begin your investing journey!",i:"🚀",c:"#94a3b8"};

  // Actionable tips
  const tips = [
    {tip:"Set up a weekly 15-minute money check-in",detail:"Every Sunday, spend 15 minutes looking at your accounts. You'll catch problems early and stay motivated.",cat:"Habit"},
    {tip:"Round up every purchase to save the difference",detail:"If coffee costs $4.50, mentally round to $5 and move $0.50 to savings. Many banks automate this.",cat:"Saving"},
    {tip:"Unsubscribe from one unused subscription today",detail:"Check your bank statement for recurring charges. Cancel anything you haven't used in 30 days.",cat:"Saving"},
    {tip:"Increase your 401(k) by just 1% this month",detail:"You won't notice 1% less in your paycheck, but over 30 years it could mean $50,000+ more at retirement.",cat:"Investing"},
    {tip:"Set up automatic investing on payday",detail:"Schedule transfers to your investment account the same day you get paid. What you don't see, you don't spend.",cat:"Investing"},
    {tip:"Check your credit report for free today",detail:"Go to annualcreditreport.com. Look for errors — even small mistakes can lower your score and cost you money.",cat:"Credit"},
    {tip:"Move your emergency fund to a HYSA if it isn't already",detail:"It takes 10 minutes to open a HYSA. Your emergency fund earns 4-5% instead of 0.5%. Same safety, more growth.",cat:"Saving"},
    {tip:"Name your savings goals — studies show it helps",detail:"'Vacation Fund' or 'New Car' feels more real than 'Savings Account 2'. You're less likely to raid a named goal.",cat:"Habit"},
    {tip:"Calculate your actual hourly wage for big purchases",detail:"Before buying something expensive, divide the price by your hourly pay. Is that item worth X hours of your life?",cat:"Habit"},
    {tip:"Set a 48-hour rule for non-essential purchases over $50",detail:"Wait 48 hours before buying. If you still want it after sleeping on it twice, go ahead. Most impulse urges fade.",cat:"Habit"},
    {tip:"Review your investment fees — switch if above 0.2%",detail:"Low-cost index funds charge 0.03-0.10%. If you're paying 1%+, you're giving away a huge chunk of returns over time.",cat:"Investing"},
    {tip:"Tell one person about your financial goals today",detail:"Accountability works. Sharing goals makes you 65% more likely to achieve them according to research.",cat:"Habit"},
  ];

  return (<div>
    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
      <div style={{ fontSize:28 }}>🎓</div>
      <div><div style={{ fontSize:20,fontWeight:800,color:"#fbbf24" }}>Investing Academy</div><div style={{ fontSize:12,color:"#94a3b8" }}>Advanced concepts made simple. Your path to wealth.</div></div>
    </div>
    <div style={{ display:"flex",gap:4,marginBottom:16,flexWrap:"wrap" }}>
      {[{k:"glossary",l:"📖 Glossary"},{k:"quiz",l:"🧩 Quiz"},{k:"strategy",l:"📋 Strategy"},{k:"tips",l:"💡 Quick Wins"}].map(v => (<button key={v.k} onClick={() => setView(v.k)} style={{ padding:"8px 12px",borderRadius:8,border:view===v.k?"1px solid #fbbf24":"1px solid rgba(255,255,255,0.06)",background:view===v.k?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.02)",color:view===v.k?"#fbbf24":"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{v.l}</button>))}
    </div>
    {view==="glossary"&&<Card>
      <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." style={{ width:"100%",padding:"8px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e2e8f0",fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:12,boxSizing:"border-box" }} />
      {cats.map(cat => { const items = ft.filter(t => t.cat === cat); if (!items.length) return null; return (<div key={cat} style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:1,marginBottom:6 }}>{cat}</div>
        {items.map((t,i) => (<div key={i} onClick={() => setExpandedTerm(expandedTerm===t.term?null:t.term)} style={{ padding:10,marginBottom:4,borderRadius:8,background:expandedTerm===t.term?"rgba(251,191,36,0.04)":"rgba(255,255,255,0.02)",border:expandedTerm===t.term?"1px solid rgba(251,191,36,0.12)":"1px solid rgba(255,255,255,0.04)",cursor:"pointer" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><div style={{ fontSize:12,fontWeight:600,color:"#e2e8f0" }}>{t.term}</div><span style={{ fontSize:10,color:"#475569",transform:expandedTerm===t.term?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",display:"inline-block" }}>▼</span></div>
          <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5,marginTop:4 }}>{t.simple}</div>
          {expandedTerm===t.term&&<div style={{ fontSize:11,color:"#fbbf24",lineHeight:1.6,marginTop:8,padding:10,background:"rgba(251,191,36,0.04)",borderRadius:8 }}>{t.detail}</div>}
        </div>))}
      </div>); })}
    </Card>}
    {view==="quiz"&&<Card>
      <div style={{ display:"flex",gap:6,marginBottom:14 }}>{ACADEMY_QUIZZES.map((_,i) => (<button key={i} onClick={() => { setQuizIdx(i); resetAQ(); }} style={{ padding:"8px 14px",borderRadius:8,border:quizIdx===i?"1px solid #fbbf24":"1px solid rgba(255,255,255,0.06)",background:quizIdx===i?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.02)",color:quizIdx===i?"#fbbf24":"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Quiz {i+1}</button>))}</div>
      {done ? (<div style={{ textAlign:"center",padding:20 }}>
        <div style={{ fontSize:36,marginBottom:6 }}>{sc>=qs.length*0.8?"🏆":sc>=qs.length*0.6?"💪":"📚"}</div>
        <div style={{ fontSize:22,fontWeight:800,color:sc>=qs.length*0.8?"#6ee7b7":"#fbbf24" }}>{sc}/{qs.length}</div>
        <div style={{ fontSize:12,color:"#94a3b8",marginTop:4,marginBottom:12 }}>{sc>=qs.length*0.8?"Exceptional!":sc>=qs.length*0.6?"Solid grasp!":"Keep studying!"}</div>
        <MiniBar value={sc} max={qs.length} color={sc>=qs.length*0.8?"#6ee7b7":"#fbbf24"} height={8} />
        <div style={{ marginTop:12 }}><Btn onClick={resetAQ} small>Retry</Btn></div>
      </div>) : (<div>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:11,color:"#64748b" }}>Q{qI+1}/{qs.length}</span><span style={{ fontSize:11,fontWeight:600,color:"#fbbf24" }}>{sc}</span></div>
        <MiniBar value={qI+1} max={qs.length} color="#fbbf24" height={4} />
        <div style={{ fontSize:14,fontWeight:600,color:"#e2e8f0",marginTop:12,marginBottom:12,lineHeight:1.5 }}>{qs[qI]?.q}</div>
        <div style={{ display:"grid",gap:6 }}>{qs[qI]?.opts.map((o,i) => {
          const isC=i===qs[qI].correct, isS=ans===i;
          return (<button key={i} onClick={() => answerAQ(i)} style={{ padding:"10px 14px",borderRadius:10,background:ans!==null?(isC?"rgba(110,231,183,0.1)":isS?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.02)"):"rgba(255,255,255,0.03)",border:`1px solid ${ans!==null?(isC?"rgba(110,231,183,0.25)":isS?"rgba(248,113,113,0.25)":"rgba(255,255,255,0.04)"):"rgba(255,255,255,0.08)"}`,color:ans!==null?(isC?"#6ee7b7":isS?"#f87171":"#64748b"):"#e2e8f0",fontSize:12,cursor:ans!==null?"default":"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left" }}>{o}</button>);
        })}</div>
      </div>)}
    </Card>}
    {view==="strategy"&&<div>
      <div style={{ display:"flex",gap:4,marginBottom:12 }}>{Object.entries(strategies).map(([k,s]) => (<button key={k} onClick={() => setStrategyMode(k)} style={{ padding:"8px 12px",borderRadius:8,border:strategyMode===k?`1px solid ${s.color}`:"1px solid rgba(255,255,255,0.06)",background:strategyMode===k?`${s.color}12`:"rgba(255,255,255,0.02)",color:strategyMode===k?s.color:"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{s.label}</button>))}</div>
      <Card>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
          <div style={{ fontSize:14,fontWeight:700,color:currentStrat.color }}>{currentStrat.label}</div>
          <span style={{ fontSize:11,color:"#94a3b8" }}>{stratChecked}/{currentStrat.steps.length} complete</span>
        </div>
        <MiniBar value={stratChecked} max={currentStrat.steps.length} color={currentStrat.color} height={8} />
        <div style={{ marginTop:6,marginBottom:14,padding:"6px 10px",background:`${stratMsg.c}08`,borderRadius:6,display:"flex",alignItems:"center",gap:6 }}><span style={{ fontSize:12 }}>{stratMsg.i}</span><span style={{ fontSize:10,color:stratMsg.c }}>{stratMsg.t}</span></div>
        {currentStrat.steps.map((s,i) => { const checked = s.done || checkedSteps[s.id]; return (<div key={s.id} style={{ padding:12,marginBottom:6,borderRadius:10,background:checked?"rgba(110,231,183,0.04)":"rgba(255,255,255,0.02)",border:checked?"1px solid rgba(110,231,183,0.12)":"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
            <button onClick={() => !s.done && toggleCheck(s.id)} style={{ width:22,height:22,borderRadius:6,border:checked?"1px solid #6ee7b7":"1px solid rgba(255,255,255,0.15)",background:checked?"rgba(110,231,183,0.15)":"rgba(255,255,255,0.03)",color:checked?"#6ee7b7":"#475569",fontSize:12,cursor:s.done?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>{checked?"✓":""}</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12,fontWeight:600,color:checked?"#6ee7b7":"#e2e8f0",textDecoration:checked?"line-through":"none",opacity:checked?0.7:1 }}>{s.text}</div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:3,lineHeight:1.5,fontStyle:"italic" }}>Why: {s.why}</div>
            </div>
          </div>
        </div>); })}
      </Card>
    </div>}
    {view==="tips"&&<div>
      <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:12 }}>Things you can do right now to improve your finances:</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {(cleanMode?tips.slice(0,6):tips).map((t,i) => (<Card key={i} style={{ padding:16 }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
            <div style={{ fontSize:18,flexShrink:0 }}>{t.cat==="Habit"?"🔄":t.cat==="Saving"?"💰":t.cat==="Investing"?"📈":"💳"}</div>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:"#e2e8f0",marginBottom:4 }}>{t.tip}</div>
              <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5 }}>{t.detail}</div>
              <div style={{ fontSize:9,color:t.cat==="Habit"?"#a78bfa":t.cat==="Saving"?"#6ee7b7":t.cat==="Investing"?"#fbbf24":"#38bdf8",marginTop:6,textTransform:"uppercase",letterSpacing:1,fontWeight:700,padding:"2px 8px",background:t.cat==="Habit"?"rgba(167,139,250,0.1)":t.cat==="Saving"?"rgba(110,231,183,0.1)":t.cat==="Investing"?"rgba(251,191,36,0.1)":"rgba(56,189,248,0.1)",borderRadius:4,display:"inline-block" }}>{t.cat}</div>
            </div>
          </div>
        </Card>))}
      </div>
    </div>}
  </div>);
}

// ═══ MAIN APP ═══
export default function FinancialPlanner() {
  const [tab, setTab] = useState("dashboard");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [savings, setSavings] = useState([]);
  const [emergency, setEmergency] = useState({ months:6,target:0,saved:0,monthlyContribution:0 });
  const [investments, setInvestments] = useState([]);

  const [toasts, setToasts] = useState([]);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [totalOrigDebt, setTotalOrigDebt] = useState(0);
  const [bills, setBills] = useState([]);
  const [compactMode, setCompactMode] = useState(false);
  const liteTabs = ["dashboard","expenses","debt","savings"];
  const flashTab = (tabId) => { setTabFlash(tabId); setTimeout(() => setTabFlash(null), 2500); };
  const setupSteps = [
    { check: () => income > 0, page: "dashboard", msg: "Let's start! Enter your monthly income above.", done: "Income set! Ready to add expenses?" },
    { check: () => expenses.length > 0, page: "expenses", msg: "Now add your monthly expenses.", done: "Expenses added! Let's set up your emergency fund." },
    { check: () => emergency.target > 0, page: "emergency", msg: "Set your emergency fund target and contribution.", done: "Emergency fund started! Any debts or loans to track?" },
    { check: () => debts.length > 0 || setupOverrides["debt"], page: "debt", msg: "Add any debts or loans you want to pay off.", done: "Debt plan active! Any bills or fines to add?", skip: "No debts or loans? Great! Any bills or fines?" },
    { check: () => bills.length > 0 || setupOverrides["bills_skip"], page: "debt_bills", msg: "Add any outstanding bills or fines.", done: "Bills added! Want to sync to your calendar?", skip: "No bills? Moving on to savings goals." },
    { check: () => calendarEnabled || setupOverrides["cal_skip"], page: "debt_calendar", msg: "Sync your payments to Google Calendar?", skip: "No problem! Let's set savings goals." },
    { check: () => savings.length > 0 || setupOverrides["saving_skip"], page: "savings", msg: "Add your savings goals.", done: "Savings set!", skip: "No goals yet? That is fine!" },
  ];
  const advanceSetupFlow = () => {
    if (!setupFlow) return;
    var step = setupFlowStep;
    while (step < setupSteps.length && setupSteps[step].check()) step++;
    if (step >= setupSteps.length) {
      setCompanionMsg("Initial setup complete! Your full overview is in the Dashboard.");
      setCompanionColor("purple"); setCompanionGlow(true); addToast2("Setup complete!");
      addFeed2("Initial setup complete!");
      flashTab("dashboard");
      setTimeout(() => { setTab("dashboard"); }, 1500);
      setSetupFlow(null); setSetupFlowStep(0);
      setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); setCompanionMsg("Tracking your progress. Ask me what to do next!"); }, 6000);
      return;
    }
    setSetupFlowStep(step);
    var s = setupSteps[step];
    setCompanionMsg(s.msg);
    var noLabel = step <= 2 ? "Not now" : step === 3 ? "No debts or loans" : "Skip";
    setCompanionQ({ type:"setup_flow", page:s.page, yes:"Show me", no:noLabel });
  };
  useEffect(() => {
    if (!setupFlow || !initialized.current) return;
    var step = setupSteps[setupFlowStep];
    if (step && step.check()) {
      var doneMsg = step.done || "Done! Next step?";
      setCompanionMsg(doneMsg);
      setCompanionColor("green"); setCompanionGlow(true);
      setTimeout(() => { setCompanionGlow(false); advanceSetupFlow(); }, 2000);
    }
  }, [income, expenses.length, emergency.target, debts.length, savings.length, bills.length, calendarEnabled]);
  const handleCompanionAsk = () => {
    var q = companionInput.toLowerCase().trim();
    setCompanionInput("");
    if (!q) return;
    if (q.includes("help") || q.includes("setup") || q.includes("start") || q.includes("what do i do") || q.includes("next") || q.includes("what now") || q.includes("guide")) {
      var allSetup = income > 0 && expenses.length > 0 && emergency.target > 0;
      if (!allSetup) { setSetupFlow(true); advanceSetupFlow(); }
      else {
        var nm2 = getNextMove2();
        setCompanionMsg(nm2);
        var pg2 = "dashboard";
        if (nm2.includes("expense") || nm2.includes("trim")) pg2 = "expenses";
        else if (nm2.includes("emergency") || nm2.includes("fund")) pg2 = "emergency";
        else if (nm2.includes("debt") || nm2.includes("loan") || nm2.includes("paying")) pg2 = "debt";
        else if (nm2.includes("invest")) pg2 = "investments";
        setCompanionQ({ type:"nav_page", page:pg2, yes:"Show me", no:"I'm good" });
        setCompanionGlow(true); setTimeout(function() { setCompanionGlow(false); }, 3000);
      }
    } else if (q.includes("invest")) {
      setCompanionMsg("Investing grows your wealth over time. Want to learn more?"); setCompanionQ({ type:"nav_page", page:"learn", yes:"Teach me", no:"Not now" });
    } else if (q.includes("debt") || q.includes("loan")) {
      setCompanionMsg("Managing debt is key to financial freedom. Check your debt plan?"); setCompanionQ({ type:"nav_page", page:"debt", yes:"Show me", no:"Not now" });
    } else if (q.includes("save") || q.includes("emergency")) {
      setCompanionMsg("Saving builds your safety net. Want to review your goals?"); setCompanionQ({ type:"nav_page", page:"savings", yes:"Show me", no:"Not now" });
    } else if (q.includes("budget") || q.includes("spend")) {
      setCompanionMsg("Budgeting gives you control. Want to review your split?"); setCompanionQ({ type:"nav_page", page:"budget", yes:"Show me", no:"Not now" });
    } else if (q.includes("quiz") || q.includes("learn")) {
      setCompanionMsg("Learning is power! Ready to test your knowledge?"); setCompanionQ({ type:"nav_page", page:"learn", yes:"Let's go", no:"Not now" });
    } else {
      setCompanionMsg("Try: 'help me setup', 'what do I do next', 'invest', 'debt', 'save', 'budget', or 'quiz'");
    }
  };
  useEffect(() => {
    if (compactMode && !liteTabs.includes(tab)) setTab("dashboard");
  }, [compactMode]);
  useEffect(() => {
    if (tab === "learn" && !learnVisited) {
      setLearnVisited(true);
      setCompanionMsg("Welcome to the Learn page! Start with the Dictionary to build your knowledge, then test yourself with the quizzes.");
      setCompanionColor("purple"); setCompanionGlow(true); setCompanionOpen(true);
      setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 5000);
    }
  }, [tab]);
  const [cleanMode, setCleanMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeChecked, setWelcomeChecked] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [budgetPreset, setBudgetPreset] = useState("50/30/20");
  const [academyUnlocked, setAcademyUnlocked] = useState(true);
  const [budgetSplits, setBudgetSplits] = useState({needs:50,wants:30,sav:10,invest:10});
  const seenMilestones = useRef(new Set());
  const initialized = useRef(false);

  useEffect(() => { setCurrencyGlobal(currency); }, [currency]);

  useEffect(() => {
    if (!initialized.current) {
      const state = { emergency, debts, savings, investments };
      MILESTONES.forEach(m => { if (m.check(state)) seenMilestones.current.add(m.key); });
      initialized.current = true;
    }
  }, []);

  const prevState = useRef(null);
  useEffect(() => {
    if (!initialized.current) return;
    const state = { emergency, debts, savings, investments };
    if (prevState.current) {
      MILESTONES.forEach(m => {
        if (!seenMilestones.current.has(m.key) && m.check(state) && !m.check(prevState.current)) {
          seenMilestones.current.add(m.key);
          setToasts(prev => [...prev, { ...m, ts: Date.now() }]);
        }
      });
    }
    prevState.current = { emergency:{...emergency}, debts:debts.map(d => ({...d})), savings:savings.map(s => ({...s})), investments:investments.map(i => ({...i})) };
  }, [emergency, debts, savings, investments]);

  useEffect(() => {
    const total = expenses.reduce((s,e) => s+e.amount, 0);
    if (emergency.months && total > 0) setEmergency(prev => ({...prev, target: total * prev.months}));
  }, [expenses, emergency.months]);


  // ═══ FINANCIAL STATE ENGINE ═══
  const te = expenses.reduce((s,e) => s+e.amount, 0);
  const td = debts.reduce((s,d) => s+d.balance, 0);
  const minDebtPayment = debts.reduce((s,d) => s+d.minPayment, 0);
  const moneyLeft = income - te - minDebtPayment;
  const ti = investments.reduce((s,i) => s+i.currentValue, 0);
  const ts = savings.reduce((s,g) => s+g.saved, 0);
  const efPct = emergency.target > 0 ? emergency.saved / emergency.target : 0;
  const debtPaid = debts.reduce((s,d) => s+(d.originalBalance-d.balance), 0);
  const debtTotal = debts.reduce((s,d) => s+d.originalBalance, 0);
  const debtPct = debtTotal > 0 ? debtPaid / debtTotal : 1;
  const progressScore = Math.min(100, Math.round(15 + (efPct * 20) + (debtPct * 25) + (ti > 0 ? 15 : 0) + (moneyLeft > 0 ? 15 : 0)));
  const finState = progressScore < 20 ? { level:0, label:"Recovering", color:"#f87171" } : progressScore < 40 ? { level:1, label:"Adjusting", color:"#fbbf24" } : progressScore < 60 ? { level:2, label:"Stabilizing", color:"#34d399" } : progressScore < 80 ? { level:3, label:"Growing", color:"#38bdf8" } : { level:4, label:"Optimizing", color:"#a78bfa" };
  const [setupOverrides, setSetupOverrides] = useState({});
  const [showSetup, setShowSetup] = useState(false);
  const setupRaw = [{key:"income",label:"Income set",auto:income>0},{key:"expenses",label:"Expenses added",auto:expenses.length>0},{key:"debt",label:"Debt plan active",auto:debts.length>0},{key:"emergency",label:"Emergency fund started",auto:emergency.saved>0},{key:"investing",label:"Investing started (optional)",auto:investments.length>0}];
  const setupChecks = setupRaw.map(s => ({...s, done: setupOverrides[s.key] !== undefined ? setupOverrides[s.key] : s.auto}));
  const setupDone = setupChecks.filter(c => c.done).length;
  const setupPct = setupDone / setupChecks.length;
  const toggleSetup = (key) => setSetupOverrides(p => ({...p, [key]: p[key] !== undefined ? !p[key] : !setupRaw.find(s => s.key===key).auto}));
  const prevFinLevel = useRef(finState.level);
  const [stateTransition, setStateTransition] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionMsg, setCompanionMsg] = useState("Welcome! Tracking your progress.");
  const [companionGlow, setCompanionGlow] = useState(false);
  const [companionQ, setCompanionQ] = useState(null);
  const [companionVibrate, setCompanionVibrate] = useState(false);
  const [smartToasts, setSmartToasts] = useState([]);
  const addToast2 = (msg) => { const id = Date.now(); setSmartToasts(p => [...p, {msg,id}]); setTimeout(() => setSmartToasts(p => p.filter(t => t.id!==id)), 5500); };
  const addFeed2 = (text) => { setFeedItems(p => [{text, ts:Date.now()}, ...p].slice(0,8)); };
  useEffect(() => {
    if (prevFinLevel.current !== finState.level && initialized.current) {
      const labels = ["Recovering","Adjusting","Stabilizing","Growing","Optimizing"];
      const fr = labels[prevFinLevel.current];
      setStateTransition({from:fr, to:finState.label});
      addFeed2("State: " + fr + " to " + finState.label);
      addToast2("Moved from " + fr + " to " + finState.label);
      setCompanionMsg("State improved to " + finState.label);
      setCompanionGlow(true); setTimeout(() => setCompanionGlow(false), 3000);
      prevFinLevel.current = finState.level;
      setTimeout(() => setStateTransition(null), 5000);
    }
  }, [finState.level]);
  const prevExpCt = useRef(expenses.length);
  const prevDebtB = useRef(td);
  useEffect(() => {
    if (!initialized.current) return;
    if (expenses.length > prevExpCt.current) {
      addFeed2("Budget rebalanced"); addToast2("Expense noted, plan adjusted");
      setCompanionMsg("Staying aware keeps you in control. Plan rebalanced.");
      setCompanionColor("green"); setCompanionGlow(true); setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 3000);
    }
    prevExpCt.current = expenses.length;
  }, [expenses.length]);
  useEffect(() => {
    if (!initialized.current || prevDebtB.current===null) { prevDebtB.current=td; return; }
    if (td < prevDebtB.current && prevDebtB.current > 0) {
      const sv = prevDebtB.current - td;
      addFeed2("Debt reduced by " + formatCurrency(sv));
      setCompanionMsg("Debt-free date moved closer. " + formatCurrency(sv) + " eliminated!");
      setCompanionColor("green"); setCompanionGlow(true); setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 3000);
    }
    prevDebtB.current = td;
  }, [td]);
  // Companion questions + celebrations on milestones
  const prevTdRef = useRef(td);
  const prevEfRef = useRef(efPct);
  const prevSetupRef = useRef(setupPct);
  const [companionColor, setCompanionColor] = useState("green");
  const funFacts = [
    "Paying yourself first is the #1 habit of millionaires",
    "Compound interest was called the 8th wonder of the world by Einstein",
    "The 50/30/20 rule: 50% needs, 30% wants, 20% savings",
    "Automating savings increases success rate by 80%",
    "An emergency fund of 3-6 months expenses prevents 90% of financial crises",
    "Every dollar of debt paid saves you more than a dollar in interest",
    "Starting to invest 10 years earlier can double your retirement fund",
    "People who track expenses save on average 15% more",
    "The average millionaire has 7 income streams",
    "A budget isn't restrictive. It gives you permission to spend guilt-free",
    "Paying the minimum on credit cards can mean paying 3x the original amount",
    "The best time to start investing was yesterday. The second best is today",
  ];
  const todayFact = funFacts[new Date().getDate() % funFacts.length];
  useEffect(() => {
    if (!initialized.current) return;
    const wasTd = prevTdRef.current;
    const wasEf = prevEfRef.current;
    const wasSetup = prevSetupRef.current;
    prevTdRef.current = td;
    prevEfRef.current = efPct;
    prevSetupRef.current = setupPct;
    // Debt fully cleared (balance went to 0 or all debts removed)
    if ((wasTd > 0 && td === 0) || (wasTd > 0 && debts.length === 0)) {
      addFeed2("Debt free! Massive achievement."); addToast2("You are debt free!");
      setCompanionColor("gold"); setCompanionGlow(true); setCompanionOpen(true);
      if (efPct < 1) {
        setCompanionMsg("Debt free! Build your emergency fund next?");
        setCompanionQ({ type: "emergency_next", yes: "Yes, let's go!", no: "Not now" });
      } else if (investments.length === 0) {
        setCompanionMsg("Debt free! Ready to start investing?");
        setCompanionQ({ type: "invest_start", yes: "Yes, let's learn!", no: "Not yet" });
      } else {
        setCompanionMsg("Debt free! Consider boosting your investments?");
        setCompanionQ({ type: "boost_invest", yes: "Review investments", no: "I'm good" });
      }
      return;
    }
    // Emergency fund fully funded - context-aware next step
    if (wasEf < 1 && efPct >= 1) {
      addFeed2("Emergency fund fully funded!"); addToast2("Emergency fund complete!");
      setCompanionColor("blue"); setCompanionGlow(true); setCompanionOpen(true);
      if (td > 0 && debts.length > 0) {
        setCompanionMsg("Emergency fund complete! Focus extra on debt payoff?");
        setCompanionQ({ type: "debt_focus", yes: "Yes, accelerate!", no: "I'll decide later" });
      } else if (investments.length === 0) {
        setCompanionMsg("Emergency fund complete! Ready to start investing?");
        setCompanionQ({ type: "invest_start", yes: "Yes, let's learn!", no: "Not yet" });
      } else {
        setCompanionMsg("Emergency fund complete! Consider increasing investments?");
        setCompanionQ({ type: "boost_invest", yes: "Review investments", no: "I'm good" });
      }
      return;
    }
    // Single debt paid off (any debt balance hits 0)
    if (wasTd > td && debts.some(d => d.balance === 0 && d.originalBalance > 0)) {
      setCompanionMsg("A debt is fully paid off! Keep this momentum going.");
      setCompanionColor("gold"); setCompanionGlow(true);
      setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 4000);
      return;
    }
    // First investment added
    if (investments.length > 0 && !companionQ) {
      var wasInvesting = prevTdRef.current !== undefined;
    }
    // (cashflow prompt removed - too eager on initial load)
    // Emergency fund half
    if (wasEf < 0.5 && efPct >= 0.5 && efPct < 1) {
      setCompanionMsg("Emergency fund is 50% funded! Huge milestone.");
      setCompanionColor("blue"); setCompanionGlow(true);
      addFeed2("Emergency fund halfway!"); addToast2("50% emergency fund funded!");
      setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 4000);
      return;
    }
    // Setup complete
    if (wasSetup < 1 && setupPct >= 1) {
      setCompanionMsg("Full setup complete! You now have total financial clarity.");
      setCompanionColor("purple"); setCompanionGlow(true);
      addFeed2("Setup complete. Full clarity achieved.");
      setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 4000);
      return;
    }
    // Half debt paid
    if (wasTd > 0 && debtPct >= 0.5 && (wasTd > 0 ? (debtPaid - (wasTd - td)) / debtTotal : 0) < 0.5) {
      setCompanionMsg("Over 50% of debt eliminated! Incredible progress.");
      setCompanionColor("gold"); setCompanionGlow(true);
      addFeed2("50% of debt eliminated!"); addToast2("Half your debt is gone!");
      setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); }, 4000);
    }
  }, [td, efPct, setupPct, debts.length]);
  const handleCompanionAnswer = (answer) => {
    if (!companionQ) return;
    if (companionQ.type === "invest_start") {
      if (answer === "yes") { setCompanionMsg("Let's learn first! Head to the Learn page."); setTab("learn"); }
      else { setCompanionMsg("No problem. Check Learn page when you're curious."); }
    } else if (companionQ.type === "debt_focus") {
      if (answer === "yes") { setCompanionMsg("Great! Head to Debt page to increase payments."); setTab("debt"); }
      else { setCompanionMsg("Sounds good. Your plan stays on track."); }
    } else if (companionQ.type === "emergency_next") {
      if (answer === "yes") { setCompanionMsg("Smart choice! Head to emergency fund."); setTab("emergency"); }
      else { setCompanionMsg("No rush. Your system keeps working."); }
    } else if (companionQ.type === "review_budget") {
      if (answer === "yes") { setCompanionMsg("Let's optimize! Head to budget."); setTab("budget"); }
      else { setCompanionMsg("All good. Come back anytime."); }
    } else if (companionQ.type === "boost_invest") {
      if (answer === "yes") { setCompanionMsg("Great choice! Check your investments."); setTab("investments"); }
      else { setCompanionMsg("No rush. Your portfolio keeps growing."); }
    } else if (companionQ.type === "nav_page") {
      if (answer === "yes") { setTab(companionQ.page); flashTab(companionQ.page); setCompanionMsg("Here you go! Take a look around."); }
      else { setCompanionMsg("No worries. Ask anytime you need help."); }
    } else if (companionQ.type === "setup_flow") {
      if (answer === "yes") {
        var pg = companionQ.page;
        if (pg === "debt_bills") { setTab("debt"); flashTab("debt"); setTimeout(function() { window.dispatchEvent(new CustomEvent("debtSetView",{detail:"bills"})); }, 600); }
        else if (pg === "debt_calendar") { setTab("debt"); flashTab("debt"); setTimeout(function() { window.dispatchEvent(new CustomEvent("debtSetView",{detail:"calendar"})); }, 600); }
        else { setTab(pg); flashTab(pg); }
        setCompanionMsg("Go ahead and fill this in. I will check when you are done.");
      } else {
        var stp2 = setupSteps[setupFlowStep];
        if (stp2 && stp2.skip) setCompanionMsg(stp2.skip);
        if (setupFlowStep < 3) { setSetupFlow(null); setCompanionMsg("No problem. Ask anytime to continue setup."); }
        else { setSetupOverrides(function(p) { var n = {}; for (var k in p) n[k] = p[k]; if (setupFlowStep === 3) n["debt"] = true; if (setupFlowStep === 4) n["bills_skip"] = true; if (setupFlowStep === 5) n["cal_skip"] = true; if (setupFlowStep === 6) n["saving_skip"] = true; return n; }); setTimeout(function() { advanceSetupFlow(); }, 500); }
      }
    }
    setCompanionQ(null);
    setCompanionColor("green");
    setTimeout(() => setCompanionGlow(false), 2000);
  };
  // Momentum: tracks real days via computer calendar
  const [momData2, setMomData2] = useState(() => {
    var now = new Date();
    var dayOfWeek = now.getDay() || 7; // Mon=1..Sun=7
    return { lastActive: now.toDateString(), streak: dayOfWeek, weekCount: 1 };
  });
  useEffect(() => {
    var now = new Date();
    var today = now.toDateString();
    if (momData2.lastActive !== today) {
      var last = new Date(momData2.lastActive);
      var diff = Math.floor((now - last) / 86400000);
      if (diff === 1) {
        setMomData2({ lastActive: today, streak: momData2.streak + 1, weekCount: momData2.streak >= 7 ? momData2.weekCount + 1 : momData2.weekCount });
      } else if (diff > 1) {
        setMomData2({ lastActive: today, streak: 1, weekCount: Math.max(0, momData2.weekCount - 1) });
      }
    }
  }, []);
  var momStreak = momData2.streak;
  var momWeek = momData2.weekCount;
  var momDayInWeek = ((momStreak - 1) % 7) + 1;
  var momBarPct = Math.round((momDayInWeek / 7) * 100);
  var momBarColor = momWeek >= 4 ? "#a78bfa" : momWeek >= 3 ? "#38bdf8" : momWeek >= 2 ? "#6ee7b7" : momWeek >= 1 ? "#fbbf24" : "#475569";
  var momFaded = momStreak <= 0;
  const getNextMove2 = () => {
    if (income === 0) return "Set your monthly income to get started";
    if (expenses.length === 0) return "Add your expenses for a clear picture";
    if (emergency.saved === 0 && moneyLeft > 0) return "Start your emergency fund. Even " + formatCurrency(50) + " creates a safety net";
    if (moneyLeft < 0) return "Expenses exceed income by " + formatCurrency(Math.abs(moneyLeft)) + ". Review to trim";
    const topDebt = debts.length > 0 ? debts.slice().sort((a,b) => b.rate - a.rate)[0] : null;
    if (topDebt && debtPct < 0.25) return "Focus on " + topDebt.name + " (" + topDebt.rate + "% APR). Each payment accelerates freedom";
    if (efPct < 0.5 && moneyLeft > 0) return "Build emergency fund to " + formatCurrency(Math.round(emergency.target * 0.5)) + ". Halfway is a huge milestone";
    if (topDebt && debtPct < 0.5 && moneyLeft > 0) return "Extra " + formatCurrency(Math.min(Math.round(moneyLeft * 0.3), 200)) + " on " + topDebt.name + " moves your freedom date closer";
    if (efPct < 1 && moneyLeft > 0) return "Add " + formatCurrency(Math.min(Math.round(moneyLeft * 0.2), Math.round(emergency.target - emergency.saved))) + " to emergency fund";
    if (investments.length === 0) return "Start investing. Even " + formatCurrency(50) + "/mo compounds significantly over 10 years";
    if (topDebt && debtPct < 0.75) return "Keep paying down " + topDebt.name + ". " + Math.round(debtPct * 100) + "% eliminated so far";
    if (debtPct >= 0.75 && investments.length > 0) return "Consider increasing investment contributions. Fundamentals are strong";
    if (td === 0 && efPct >= 1) return "All clear. Focus on growing investments and enjoying your stability";
    return "Stay consistent. Your system is working for you";
  };
  const nextMove = { text: getNextMove2() };
  const insightText = setupPct<0.6 ? "Building clarity. Each step makes the next easier" : setupPct<1 ? "Almost there. Setup gives full clarity" : finState.level<=1 ? "Past the hardest part. Small actions win" : finState.level===2 ? "Consistency is key now" : finState.level===3 ? "Money working for you. Keep momentum" : "Thinking like someone in control";
  const [altDash, setAltDash] = useState(false);
  const [showHealthBars, setShowHealthBars] = useState(false);
  const [headerClean, setHeaderClean] = useState(true);
  const [learnVisited, setLearnVisited] = useState(false);
  const [companionInput, setCompanionInput] = useState("");
  const [setupFlow, setSetupFlow] = useState(null);
  const [setupFlowStep, setSetupFlowStep] = useState(0);
  const [tabFlash, setTabFlash] = useState(null);
  const [companionHidden, setCompanionHidden] = useState(false);
  return (
    <div style={{ minHeight:"100vh",background:"#0b0f1a",color:"#e2e8f0",fontFamily:"'DM Sans', sans-serif",position:"relative",overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 0 6px rgba(0,0,0,0.3)}input[type="range"]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;cursor:pointer;border:none}select option{background:#1e293b;color:#e2e8f0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}*{box-sizing:border-box}@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes companionPulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes tabPulse{0%,100%{background:rgba(110,231,183,0.05)}50%{background:rgba(110,231,183,0.25)}}@keyframes shake{0%,100%{transform:translateX(0)}10%{transform:translateX(-5px) rotate(-2deg)}20%{transform:translateX(5px) rotate(2deg)}30%{transform:translateX(-4px) rotate(-1.5deg)}40%{transform:translateX(4px) rotate(1.5deg)}50%{transform:translateX(-3px) rotate(-1deg)}60%{transform:translateX(3px) rotate(1deg)}70%{transform:translateX(-2px)}80%{transform:translateX(2px)}90%{transform:translateX(-1px)}}`}</style>
      <div style={{ position:"fixed",top:-200,right:-200,width:600,height:600,background:"radial-gradient(circle, rgba(110,231,183,0.04) 0%, transparent 70%)",pointerEvents:"none" }} />
      <div style={{ position:"fixed",bottom:-200,left:-200,width:600,height:600,background:"radial-gradient(circle, rgba(167,139,250,0.03) 0%, transparent 70%)",pointerEvents:"none" }} />

      <div style={{ padding:"20px 32px",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div><div style={{ fontSize:22,fontWeight:800,letterSpacing:-0.5 }}><span style={{ color:"#6ee7b7" }}>Adaptive</span><span style={{ color:"#e2e8f0" }}> Financial Growth</span><span style={{ fontSize:10,color:"#a78bfa",marginLeft:6,fontWeight:600,verticalAlign:"super" }}>SYSTEM</span></div><div style={{ fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase" }}>Your companion for financial clarity</div></div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#e2e8f0",fontSize:10,fontFamily:"'DM Sans',sans-serif",outline:"none",cursor:"pointer" }}>{CURRENCIES.map(c => (<option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>))}</select>
            <button onClick={() => setCompactMode(!compactMode)} style={{ padding:"6px 10px",borderRadius:8,background:compactMode?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.04)",border:compactMode?"1px solid rgba(167,139,250,0.2)":"1px solid rgba(255,255,255,0.08)",color:compactMode?"#a78bfa":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" }}>{compactMode?"Full View":"Lite Mode"}</button>
                        <button onClick={() => setCleanMode(!cleanMode)} style={{ padding:"6px 10px",borderRadius:8,background:cleanMode?"rgba(110,231,183,0.12)":"rgba(255,255,255,0.04)",border:cleanMode?"1px solid rgba(110,231,183,0.2)":"1px solid rgba(255,255,255,0.08)",color:cleanMode?"#6ee7b7":"#64748b",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap" }}>{cleanMode?"Clean \u2713":"Clean"}</button>
            <div style={{ display:"flex",alignItems:"center",gap:5 }}><span style={{ fontSize:9,color:"#94a3b8",fontWeight:600 }}>Personal Assistant</span><div onClick={() => setCompanionHidden(!companionHidden)} style={{ width:28,height:14,borderRadius:7,background:companionHidden?"rgba(255,255,255,0.08)":"rgba(110,231,183,0.3)",padding:2,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:companionHidden?"flex-start":"flex-end" }}><div style={{ width:10,height:10,borderRadius:5,background:companionHidden?"#475569":"#6ee7b7",transition:"all 0.2s" }} /></div></div>
            <div style={{ textAlign:"right" }}>
              <label style={{ fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1 }}>Monthly Income</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#6ee7b7",fontSize:14,fontWeight:700 }}>$</span>
                <input type="number" value={income} onChange={e => setIncome(Number(e.target.value)||0)} style={{ width:140,padding:"8px 8px 8px 22px",background:"rgba(110,231,183,0.08)",border:"1px solid rgba(110,231,183,0.15)",borderRadius:10,color:"#6ee7b7",fontSize:18,fontWeight:700,fontFamily:"'DM Sans',sans-serif",outline:"none",textAlign:"right" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FINANCIAL STATE BAR ═══ */}
      <div style={{ padding:"10px 32px 0",display:"flex",flexDirection:"column",gap:6 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <div style={{ padding:"3px 10px",borderRadius:20,background:finState.color+"15",border:"1px solid "+finState.color+"30" }}>
              <span style={{ fontSize:10,fontWeight:700,color:finState.color,textTransform:"uppercase",letterSpacing:1 }}>{finState.label}</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:1 }}>
                <span style={{ fontSize:10,color:momBarColor,fontWeight:600 }}>{momStreak}d</span>
                <span style={{ fontSize:7,color:momBarColor,opacity:0.7,textTransform:"uppercase",letterSpacing:0.5 }}>streak</span>
              </div>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:1 }}>
                <div style={{ width:56,height:6,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden",position:"relative" }}>
                  <div style={{ height:"100%",borderRadius:3,background:momFaded?"#475569":momBarColor,width:momBarPct+"%",transition:"width 0.5s ease" }} />
                </div>
              </div>
              {momWeek>1&&<span style={{ fontSize:8,color:momBarColor,fontWeight:700 }}>W{momWeek}</span>}
            </div>
            {stateTransition&&<div style={{ padding:"2px 8px",borderRadius:6,background:"rgba(110,231,183,0.1)",fontSize:10,color:"#6ee7b7",fontWeight:600 }}>{stateTransition.from} {"→"} {stateTransition.to}</div>}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <button onClick={() => setHeaderClean(!headerClean)} style={{ background:headerClean?"rgba(167,139,250,0.08)":"rgba(255,255,255,0.03)",border:headerClean?"1px solid rgba(167,139,250,0.2)":"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:headerClean?"#a78bfa":"#64748b",fontSize:8,padding:"3px 7px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600 }}>{headerClean?"Show more":"Clean"}</button>
          <div style={{ display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"4px 8px",borderRadius:6,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)" }} onClick={() => setShowSetup(!showSetup)}>
            {setupChecks.map((c,i) => (<div key={i} style={{ width:8,height:8,borderRadius:4,background:c.done?"#6ee7b7":"rgba(255,255,255,0.15)",border:c.done?"none":"1px solid rgba(255,255,255,0.25)" }} />))}
            <span style={{ fontSize:9,color:"#94a3b8",fontWeight:600 }}>Setup {setupDone}/{setupChecks.length} {showSetup?"\u25B2":"\u25BC"}</span>
          </div>
          </div>
        </div>
        {showSetup&&<div style={{ padding:10,background:"rgba(255,255,255,0.02)",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:10,color:"#64748b",marginBottom:6,fontWeight:600 }}>Setup Checklist</div>
          {setupChecks.map((c,i) => (<div key={i} onClick={() => toggleSetup(c.key)} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 6px",cursor:"pointer",borderRadius:6,background:c.done?"rgba(110,231,183,0.04)":"transparent",marginBottom:2 }}>
            <div style={{ width:16,height:16,borderRadius:4,border:c.done?"2px solid #6ee7b7":"2px solid rgba(255,255,255,0.2)",background:c.done?"#6ee7b7":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#0b0f1a",flexShrink:0,fontWeight:700 }}>{c.done&&"\u2713"}</div>
            <span style={{ fontSize:11,color:c.done?"#e2e8f0":"#94a3b8" }}>{c.label}</span>
          </div>))}
        </div>}
        <div style={{ height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
          <div style={{ height:"100%",borderRadius:2,background:"linear-gradient(90deg, "+finState.color+"80, "+finState.color+")",width:progressScore+"%",transition:"width 0.8s ease" }} />
        </div>
        {!headerClean&&<div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12 }}>
          <div style={{ fontSize:10,color:"#94a3b8" }}>{finState.label} · Progress: {progressScore}%</div>
          <div style={{ padding:"6px 14px",borderRadius:10,background:"rgba(110,231,183,0.04)",border:"1px solid rgba(110,231,183,0.1)",maxWidth:280 }}>
            <div style={{ fontSize:8,color:"#6ee7b7",fontWeight:700,textTransform:"uppercase",letterSpacing:1 }}>Next Best Move</div>
            <div style={{ fontSize:10,color:"#e2e8f0",lineHeight:1.3 }}>{nextMove.text}</div>
          </div>
        </div>}
        {!headerClean&&<div style={{ padding:"6px 12px",borderRadius:8,background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.08)" }}><span style={{ fontSize:11,color:"#38bdf8",fontWeight:500 }}>{"\uD83D\uDCA1"} {insightText}</span></div>}
        {!headerClean&&feedItems.length>0&&<div style={{ fontSize:10,color:"#94a3b8",padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)" }}>{feedItems[0].text}</div>}
      </div>
      <div style={{ display:"flex",gap:2,padding:"12px 32px",borderBottom:"1px solid rgba(255,255,255,0.04)",overflowX:"auto" }}>
        {(compactMode ? TABS.filter(t => ["dashboard","expenses","debt","savings"].includes(t.id)) : TABS).filter(t => !t.secret || academyUnlocked).map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"10px 18px",borderRadius:10,border:"none",background:tab===t.id?"rgba(110,231,183,0.1)":tabFlash===t.id?"rgba(110,231,183,0.15)":"transparent",animation:tabFlash===t.id?"tabPulse 0.6s ease 3":"none",color:tab===t.id?"#6ee7b7":"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",transition:"all 0.2s",display:"flex",alignItems:"center",gap:6 }}><span style={{ fontSize:14 }}>{t.icon}</span>{t.label}</button>))}
      </div>

      <div style={{ padding:"24px 32px",maxWidth:1200,margin:"0 auto" }}>
        {tab==="dashboard"&&<Dashboard income={income} expenses={expenses} savings={savings} debts={debts} emergency={emergency} investments={investments} compactMode={compactMode} cleanMode={cleanMode} moneyLeft={moneyLeft} altDash={altDash} setAltDash={setAltDash} minDebtPayment={minDebtPayment} showHealthBars={showHealthBars} setShowHealthBars={setShowHealthBars} />}
        {tab==="budget"&&<BudgetSplit income={income} expenses={expenses} debts={debts} emergency={emergency} investments={investments} preset={budgetPreset} setPreset={setBudgetPreset} splits={budgetSplits} setSplits={setBudgetSplits} cleanMode={cleanMode} />}
        {tab==="expenses"&&<Expenses expenses={expenses} setExpenses={setExpenses} income={income} cleanMode={cleanMode} />}
        {tab==="emergency"&&<EmergencyFund income={income} expenses={expenses} emergency={emergency} setEmergency={setEmergency} cleanMode={cleanMode} />}
        {tab==="debt"&&<DebtPayoff debts={debts} setDebts={setDebts} bills={bills} setBills={setBills} compactMode={compactMode} cleanMode={cleanMode} totalOrigDebt={totalOrigDebt} calendarEnabled={calendarEnabled} onToggleCalendar={() => setCalendarEnabled(!calendarEnabled)} onSyncCalendar={() => {}} />}
        {tab==="savings"&&<SavingsGoals savings={savings} setSavings={setSavings} income={income} expenses={expenses} emergency={emergency} cleanMode={cleanMode} />}
        {tab==="invest"&&<Investments investments={investments} setInvestments={setInvestments} cleanMode={cleanMode} />}
        {tab==="tips"&&<TipsAdvice income={income} expenses={expenses} debts={debts} savings={savings} emergency={emergency} investments={investments} cleanMode={cleanMode} />}
        {tab==="learn"&&<Learn onAcademyUnlock={() => setAcademyUnlocked(true)} academyUnlocked={academyUnlocked} cleanMode={cleanMode} onQuizComplete={(info) => { setCompanionColor("purple"); setCompanionGlow(true); if (info.remaining > 0) { var msg = "Quiz done! " + info.pct + "% score. " + info.remaining + " more quiz" + (info.remaining>1?"zes":"") + " before next level. Keep going!"; setCompanionMsg(msg); addToast2(msg); } else if (info.leveledUp) { var msg2 = "Level unlocked! You are moving up. Try the next level!"; setCompanionMsg(msg2); addToast2(msg2); } else { var msg3 = "Quiz done! " + info.pct + "% score. Review and try again for 70%+ to level up!"; setCompanionMsg(msg3); addToast2(msg3); } setTimeout(() => { setCompanionGlow(false); setCompanionColor("green"); setCompanionMsg("Tracking your progress. Keep going!"); }, 8000); }} />}
        {tab==="academy"&&academyUnlocked&&<InvestingAcademy income={income} expenses={expenses} debts={debts} savings={savings} emergency={emergency} investments={investments} cleanMode={cleanMode} />}
      </div>

      <div style={{ position:"fixed",top:16,right:16,zIndex:100,display:"flex",flexDirection:"column",gap:8 }}>
        {smartToasts.map(t => (<div key={t.id} style={{ padding:"14px 20px",borderRadius:12,background:"rgba(15,23,42,0.97)",border:"1px solid rgba(110,231,183,0.25)",backdropFilter:"blur(20px)",fontSize:12,color:"#6ee7b7",maxWidth:320,boxShadow:"0 4px 24px rgba(0,0,0,0.4)",animation:"slideIn 0.3s ease",fontWeight:500 }}>{"\u2728"} {t.msg}</div>))}
      </div>
      {!companionHidden&&<div style={{ position:"fixed",bottom:20,right:20,zIndex:80 }}>
        {!companionOpen?<button onClick={() => setCompanionOpen(true)} style={{ padding:"10px 16px",borderRadius:14,background:companionGlow?(companionColor==="gold"?"linear-gradient(135deg,rgba(251,191,36,0.25),rgba(251,191,36,0.15))":companionColor==="blue"?"linear-gradient(135deg,rgba(56,189,248,0.25),rgba(56,189,248,0.15))":companionColor==="purple"?"linear-gradient(135deg,rgba(167,139,250,0.25),rgba(167,139,250,0.15))":"linear-gradient(135deg,rgba(110,231,183,0.25),rgba(167,139,250,0.2))"):"linear-gradient(135deg,rgba(110,231,183,0.1),rgba(167,139,250,0.1))",border:companionGlow?(companionColor==="gold"?"1px solid rgba(251,191,36,0.6)":companionColor==="blue"?"1px solid rgba(56,189,248,0.6)":companionColor==="purple"?"1px solid rgba(167,139,250,0.6)":"1px solid rgba(110,231,183,0.5)"):"1px solid rgba(110,231,183,0.2)",color:"#e2e8f0",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",gap:8,boxShadow:companionGlow?(companionColor==="gold"?"0 0 24px rgba(251,191,36,0.2)":companionColor==="blue"?"0 0 24px rgba(56,189,248,0.2)":companionColor==="purple"?"0 0 24px rgba(167,139,250,0.2)":"0 0 24px rgba(110,231,183,0.2)"):"0 4px 20px rgba(0,0,0,0.3)",transition:"all 0.3s",animation:(companionGlow&&companionVibrate)?"shake 0.6s ease 2":companionQ?"companionPulse 1.2s ease-in-out infinite":"none" }}>
          <span style={{ fontSize:14 }}>{"\u2728"}</span><div><div style={{ fontWeight:700,fontSize:10,color:"#6ee7b7" }}>Smart Companion</div><div style={{ fontSize:10,color:companionQ?"#6ee7b7":"#94a3b8",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{companionQ?"Tap to answer":companionMsg}</div></div>
        </button>
        :<div style={{ width:300,borderRadius:16,background:"rgba(15,23,42,0.98)",border:"1px solid rgba(110,231,183,0.15)",backdropFilter:"blur(30px)",boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:12,fontWeight:700,color:"#6ee7b7" }}>{"\u2728"} Smart Companion</span>
            <button onClick={() => setCompanionOpen(false)} style={{ background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14 }}>{"\u00D7"}</button>
          </div>
          <div style={{ padding:12 }}>
            <div style={{ fontSize:11,color:"#e2e8f0",lineHeight:1.5,marginBottom:12,padding:10,background:"rgba(110,231,183,0.04)",borderRadius:8,fontStyle:"italic" }}>{companionMsg}</div>
            {companionQ&&<div style={{ display:"flex",gap:6,marginBottom:10 }}>
              <button onClick={() => handleCompanionAnswer("yes")} style={{ flex:1,padding:"6px 10px",borderRadius:8,background:"rgba(110,231,183,0.1)",border:"1px solid rgba(110,231,183,0.2)",color:"#6ee7b7",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{companionQ.yes}</button>
              <button onClick={() => handleCompanionAnswer("no")} style={{ flex:1,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8",fontSize:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{companionQ.no}</button>
            </div>}
            <div style={{ padding:"8px 10px",background:"rgba(56,189,248,0.04)",borderRadius:6,marginBottom:10,border:"1px solid rgba(56,189,248,0.08)" }}>
              <div style={{ fontSize:8,color:"#38bdf8",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2 }}>Fact of the day</div>
              <div style={{ fontSize:10,color:"#94a3b8",lineHeight:1.4 }}>{todayFact}</div>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}><div style={{ fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:1 }}>Recent Updates</div><div style={{ display:"flex",alignItems:"center",gap:4,cursor:"pointer" }} onClick={() => setCompanionVibrate(!companionVibrate)}><div style={{ width:24,height:14,borderRadius:7,background:companionVibrate?"rgba(110,231,183,0.3)":"rgba(255,255,255,0.08)",padding:2,transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:companionVibrate?"flex-end":"flex-start" }}><div style={{ width:10,height:10,borderRadius:5,background:companionVibrate?"#6ee7b7":"#475569",transition:"all 0.2s" }} /></div><span style={{ fontSize:8,color:companionVibrate?"#6ee7b7":"#475569" }}>Vibrate</span></div></div>
            <div style={{ maxHeight:120,overflowY:"auto" }}>
              {feedItems.length===0&&<div style={{ fontSize:10,color:"#475569",padding:8 }}>No updates yet</div>}
              {feedItems.slice(0,3).map((f,i) => (<div key={f.ts} style={{ fontSize:10,color:"#94a3b8",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>{f.text}</div>))}
            </div>
            <div style={{ marginTop:8,display:"flex",gap:4 }}>
              <input type="text" value={companionInput} onChange={e => setCompanionInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter") handleCompanionAsk(); }} placeholder="Ask me anything..." style={{ flex:1,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#e2e8f0",fontSize:10,fontFamily:"'DM Sans',sans-serif",outline:"none" }} />
              <button onClick={handleCompanionAsk} style={{ padding:"6px 10px",borderRadius:8,background:"rgba(110,231,183,0.1)",border:"1px solid rgba(110,231,183,0.2)",color:"#6ee7b7",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Ask</button>
            </div>
          </div>
        </div>}
      </div>}
      {showWelcome&&<div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)" }}>
        <div style={{ width:480,maxWidth:"90vw",borderRadius:20,background:"linear-gradient(135deg,#0f172a,#1a1e2e)",border:"1px solid rgba(110,231,183,0.15)",boxShadow:"0 20px 60px rgba(0,0,0,0.6)",padding:"32px 28px",textAlign:"center" }}>
          <div style={{ fontSize:28,marginBottom:4 }}>{"✨"}</div>
          <div style={{ fontSize:20,fontWeight:800,color:"#e2e8f0",marginBottom:4 }}>Welcome to Your Financial Planner</div>
          <div style={{ fontSize:12,color:"#94a3b8",marginBottom:20,lineHeight:1.6 }}>Your personal system for financial clarity and growth.</div>
          <div style={{ textAlign:"left",marginBottom:20 }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#6ee7b7",marginBottom:12 }}>How to get started</div>
            <div style={{ fontSize:12,color:"#cbd5e1",lineHeight:1.8,marginBottom:16 }}>Open the <span style={{ color:"#6ee7b7",fontWeight:600 }}>Smart Companion</span> (bottom right) and type <span style={{ color:"#6ee7b7",fontWeight:600 }}>"help me setup"</span>. It will guide you step by step through your income, expenses, emergency fund, debts, bills, and savings.</div>
            <div style={{ fontSize:13,fontWeight:700,color:"#a78bfa",marginBottom:10 }}>4 View Modes</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              <div style={{ padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize:10,fontWeight:700,color:"#e2e8f0" }}>Full View</div><div style={{ fontSize:9,color:"#64748b" }}>Everything visible</div></div>
              <div style={{ padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize:10,fontWeight:700,color:"#e2e8f0" }}>Full + Clean</div><div style={{ fontSize:9,color:"#64748b" }}>Slimmer overview</div></div>
              <div style={{ padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize:10,fontWeight:700,color:"#e2e8f0" }}>Lite Mode</div><div style={{ fontSize:9,color:"#64748b" }}>Only essentials</div></div>
              <div style={{ padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)" }}><div style={{ fontSize:10,fontWeight:700,color:"#e2e8f0" }}>Lite + Clean</div><div style={{ fontSize:9,color:"#64748b" }}>Minimal essentials</div></div>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",padding:"10px 20px",borderRadius:10,background:welcomeChecked?"rgba(110,231,183,0.1)":"rgba(255,255,255,0.03)",border:welcomeChecked?"1px solid rgba(110,231,183,0.2)":"1px solid rgba(255,255,255,0.08)",transition:"all 0.2s" }} onClick={() => { if (!welcomeChecked) setWelcomeChecked(true); else { setShowWelcome(false); setCompanionGlow(true); setTimeout(() => setCompanionGlow(false), 3000); } }}>
            <div style={{ width:18,height:18,borderRadius:4,border:welcomeChecked?"2px solid #6ee7b7":"2px solid rgba(255,255,255,0.2)",background:welcomeChecked?"#6ee7b7":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#0b0f1a",fontWeight:700 }}>{welcomeChecked&&"✓"}</div>
            <span style={{ fontSize:12,color:welcomeChecked?"#6ee7b7":"#94a3b8",fontWeight:600 }}>{welcomeChecked?"Click again to start":"Everything clear?"}</span>
          </div>
        </div>
      </div>}
      {toasts.map(toast => (<MilestoneToast key={toast.ts} milestone={toast} onClose={() => setToasts(prev => prev.filter(t => t.ts!==toast.ts))} />))}
    </div>
  );
}
