import { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   MONO — Income & Expense Tracker
   Faithful React replica of the Figma community design
───────────────────────────────────────────────────────────────────────────── */

const TEAL     = "#0CB8A0";
const TEAL_DIM = "rgba(12,184,160,0.15)";
const DARK     = "#1C1C1E";
const MID      = "#6B7280";
const LIGHT    = "#F3F4F6";
const WHITE    = "#FFFFFF";
const GREEN    = "#22C55E";
const RED      = "#EF4444";

/* ── SVG icon library ───────────────────────────────────────────────────────── */
const Icon = ({ name, size = 20, color = DARK, style = {} }) => {
  const paths = {
    home:      "M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9",
    chart:     "M3 3v18h18M7 16l4-4 4 4 4-4",
    wallet:    "M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zm18 4h-4a2 2 0 000 4h4",
    user:      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    bell:      "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-9.33-4.973M9 17v1a3 3 0 006 0v-1M9 17h6",
    dots:      "M5 12h.01M12 12h.01M19 12h.01",
    back:      "M19 12H5M12 5l-7 7 7 7",
    upload:    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
    plus:      "M12 5v14M5 12h14",
    send:      "M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z",
    card:      "M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z M2 11h20",
    check:     "M20 6L9 17l-5-5",
    download:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    share:     "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
    chevRight: "M9 18l6-6-6-6",
    filter:    "M4 6h16M7 12h10M10 18h4",
    calendar:  "M8 7V3M16 7V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    invite:    "M18 9l-6-6-6 6M12 3v13M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2v-1",
    lock:      "M12 17v2M8 11V7a4 4 0 018 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z",
    shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    message:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    info:      "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01",
    add:       "M12 5v14M5 12h14",
    arrowUp:   "M12 19V5M5 12l7-7 7 7",
    arrowDown: "M12 5v14M19 12l-7 7-7-7",
    delete:    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={style}>
      <path d={paths[name] || paths.plus}/>
    </svg>
  );
};

/* ── Brand logos (approximate SVG) ─────────────────────────────────────────── */
function BrandIcon({ brand, size = 40 }) {
  const brands = {
    upwork:   { bg:"#14A800", text:"Up",   color:"#fff" },
    transfer: { bg:"#E5E7EB", text:"↔",    color:"#4B5563" },
    paypal:   { bg:"#003087", text:"PP",   color:"#fff" },
    youtube:  { bg:"#FF0000", text:"▶",    color:"#fff" },
    starbucks:{ bg:"#00704A", text:"★",    color:"#fff" },
    electricity:{ bg:"#F59E0B", text:"⚡",color:"#fff" },
    rent:     { bg:"#6366F1", text:"🏠",   color:"#fff" },
    spotify:  { bg:"#1DB954", text:"♫",    color:"#fff" },
    bank:     { bg:"#0EA5E9", text:"🏦",   color:"#fff" },
    micro:    { bg:"#8B5CF6", text:"$",    color:"#fff" },
  };
  const b = brands[brand] || { bg: TEAL, text: brand[0]?.toUpperCase(), color: "#fff" };
  return (
    <div style={{
      width: size, height: size, borderRadius: 12,
      background: b.bg, color: b.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, flexShrink: 0,
      letterSpacing: -0.5,
    }}>{b.text}</div>
  );
}

/* ── Shared layout pieces ───────────────────────────────────────────────────── */
function BottomNav({ active, go }) {
  const tabs = [
    { k:"home",    icon:"home",   label:"Home"   },
    { k:"stats",   icon:"chart",  label:"Stats"  },
    { k:"wallet",  icon:"wallet", label:"Wallet" },
    { k:"profile", icon:"user",   label:"Profile"},
  ];
  return (
    <div style={{
      display:"flex", justifyContent:"space-around",
      padding:"10px 0 22px", background:WHITE,
      borderTop:"1px solid #F0F0F0", flexShrink:0,
    }}>
      {tabs.map(t => (
        <button key={t.k} onClick={() => go(t.k)} style={{
          background:"none", border:"none", cursor:"pointer",
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          padding:"0 12px",
        }}>
          <Icon name={t.icon} size={22} color={active===t.k ? TEAL : "#C0C8D0"}/>
          <span style={{
            fontSize:10, fontWeight: active===t.k ? 600 : 400,
            color: active===t.k ? TEAL : "#C0C8D0",
          }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function NavBar({ title, onBack, rightIcon = "dots", onRight, light }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"52px 20px 14px",
      background: light ? TEAL : WHITE,
      flexShrink:0,
    }}>
      {onBack
        ? <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center" }}>
            <Icon name="back" size={22} color={light ? WHITE : DARK}/>
          </button>
        : <div style={{width:22}}/>}
      <span style={{ fontSize:17, fontWeight:600, color: light ? WHITE : DARK }}>{title}</span>
      <button onClick={onRight} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center" }}>
        <Icon name={rightIcon} size={22} color={light ? WHITE : MID}/>
      </button>
    </div>
  );
}

function Pill({ children, active, onClick, style={} }) {
  return (
    <button onClick={onClick} style={{
      padding:"7px 16px", borderRadius:20, border:"none", cursor:"pointer",
      fontSize:13, fontWeight: active ? 600 : 400,
      background: active ? TEAL : "transparent",
      color: active ? WHITE : MID,
      ...style,
    }}>{children}</button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SCREENS
───────────────────────────────────────────────────────────────────────────── */

/* 1. SPLASH ----------------------------------------------------------------- */
function Splash({ go }) {
  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      background:`linear-gradient(170deg, #1ACFB5 0%, ${TEAL} 100%)`,
    }}>
      {/* wordmark */}
      <div style={{ padding:"54px 28px 0", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:10, height:10, borderRadius:5, background:"rgba(255,255,255,0.7)" }}/>
        <span style={{ fontSize:22, fontWeight:800, color:WHITE, letterSpacing:4 }}>mono</span>
      </div>

      {/* 3-D character area */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {/* decorative glow */}
        <div style={{
          position:"absolute", width:240, height:240, borderRadius:"50%",
          background:"rgba(255,255,255,0.08)", top:"50%", left:"50%",
          transform:"translate(-50%,-55%)",
        }}/>
        {/* character stand-in — stylised figure */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, zIndex:1 }}>
          {/* head */}
          <div style={{ width:70, height:70, borderRadius:35, background:"rgba(255,255,255,0.9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:38 }}>🧑</div>
          {/* body */}
          <div style={{
            width:100, height:120, borderRadius:"50px 50px 20px 20px",
            background:"rgba(255,255,255,0.2)", marginTop:-10,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ width:60, height:80, borderRadius:30, background:"rgba(255,255,255,0.25)" }}/>
          </div>
        </div>
      </div>

      {/* bottom CTA */}
      <div style={{ padding:"0 28px 48px" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <h1 style={{ margin:0, fontSize:30, fontWeight:800, color:WHITE, lineHeight:1.25 }}>
            Spend Smarter<br/>Save More
          </h1>
        </div>
        <button onClick={() => go("home")} style={{
          width:"100%", padding:"17px", borderRadius:32,
          background:WHITE, color:TEAL, border:"none",
          fontSize:16, fontWeight:700, cursor:"pointer",
          boxShadow:"0 8px 24px rgba(0,0,0,0.18)", marginBottom:16,
        }}>Get Started</button>
        <p style={{ margin:0, textAlign:"center", color:"rgba(255,255,255,0.75)", fontSize:13 }}>
          Already Have Account?{" "}
          <span style={{ color:WHITE, fontWeight:700, cursor:"pointer" }}>Log in</span>
        </p>
      </div>
    </div>
  );
}

/* 2. HOME ------------------------------------------------------------------- */
function Home({ go }) {
  const txns = [
    { brand:"upwork",   label:"Upwork",   sub:"Today",         amt:"+$850.00",  pos:true  },
    { brand:"transfer", label:"Transfer", sub:"Yesterday",     amt:"-$85.00",   pos:false },
    { brand:"paypal",   label:"Paypal",   sub:"Jan 30, 2022",  amt:"+$1,406.00",pos:true  },
    { brand:"youtube",  label:"Youtube",  sub:"Jan 15, 2022",  amt:"-$11.99",   pos:false },
  ];
  const contacts = [
    {id:1, init:"A", bg:"#F87171"}, {id:2, init:"M", bg:"#60A5FA"},
    {id:3, init:"R", bg:"#34D399"}, {id:4, init:"S", bg:"#A78BFA"},
    {id:5, init:"T", bg:"#FBBF24"},
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      {/* ── Teal hero card ─────────────────────────────────────────────── */}
      <div style={{
        background:TEAL,
        padding:"50px 22px 40px",
        borderRadius:"0 0 32px 32px",
        flexShrink:0,
      }}>
        {/* top row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
          <div>
            <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.7)", fontWeight:400 }}>Good afternoon,</p>
            <p style={{ margin:"2px 0 0", fontSize:17, fontWeight:700, color:WHITE }}>Enjelin Morgeana</p>
          </div>
          <button style={{
            width:38, height:38, borderRadius:19,
            background:"rgba(255,255,255,0.2)", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}><Icon name="bell" size={18} color={WHITE}/></button>
        </div>

        {/* balance */}
        <p style={{ margin:"0 0 2px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.7)" }}>
          Total Balance <span style={{fontSize:11}}>▲</span>
        </p>
        <p style={{ margin:"0 0 20px", textAlign:"center", fontSize:36, fontWeight:800, color:WHITE, letterSpacing:-1 }}>
          $2,548.00
        </p>

        {/* income / expense row */}
        <div style={{
          display:"flex", justifyContent:"center", gap:0,
          background:"rgba(255,255,255,0.15)", borderRadius:16, overflow:"hidden",
        }}>
          {[
            { lbl:"Income",   val:"$1,840.00", icon:"arrowDown", color:"#6EE7B7" },
            { lbl:"Expenses", val:"$284.00",   icon:"arrowUp",   color:"#FCA5A5" },
          ].map((item, i) => (
            <div key={i} style={{
              flex:1, padding:"12px 16px", textAlign:"center",
              borderRight: i===0 ? "1px solid rgba(255,255,255,0.2)" : "none",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:3 }}>
                <div style={{ width:22, height:22, borderRadius:11, background:item.color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon name={item.icon} size={12} color={DARK}/>
                </div>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.75)" }}>{item.lbl}</span>
              </div>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:WHITE }}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"18px 20px 10px" }}>
        {/* section header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <span style={{ fontSize:15, fontWeight:700, color:DARK }}>Transactions History</span>
          <span style={{ fontSize:12, color:TEAL, fontWeight:500, cursor:"pointer" }}>See all</span>
        </div>

        {/* transaction list */}
        {txns.map((tx, i) => (
          <div key={i} onClick={() => go("txDetail")} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:WHITE, borderRadius:16, padding:"13px 14px",
            marginBottom:10, cursor:"pointer",
            boxShadow:"0 1px 8px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <BrandIcon brand={tx.brand} size={42}/>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:DARK }}>{tx.label}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:MID }}>{tx.sub}</p>
              </div>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color: tx.pos ? GREEN : RED }}>{tx.amt}</span>
          </div>
        ))}

        {/* send again */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"16px 0 12px" }}>
          <span style={{ fontSize:15, fontWeight:700, color:DARK }}>Send Again</span>
          <span style={{ fontSize:12, color:TEAL, fontWeight:500, cursor:"pointer" }}>See all</span>
        </div>
        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
          {contacts.map(c => (
            <div key={c.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, cursor:"pointer" }}>
              <div style={{
                width:48, height:48, borderRadius:24, background:c.bg,
                color:WHITE, fontWeight:700, fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>{c.init}</div>
            </div>
          ))}
          {/* add FAB */}
          <button onClick={() => go("addExpense")} style={{
            width:48, height:48, borderRadius:24,
            background:TEAL, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 4px 12px ${TEAL}66`, flexShrink:0,
          }}><Icon name="plus" size={20} color={WHITE}/></button>
        </div>
      </div>

      <BottomNav active="home" go={go}/>
    </div>
  );
}

/* 3. STATISTICS ------------------------------------------------------------- */
function Stats({ go }) {
  const [period, setPeriod] = useState("Day");
  const [kind,   setKind]   = useState("Expense");

  const bars = [
    { mo:"Apr", h:35 }, { mo:"May", h:55 }, { mo:"Jun", h:40 },
    { mo:"Jan", h:90 }, { mo:"Jul", h:65 }, { mo:"Aug", h:75 },
  ];
  const topSpend = [
    { brand:"starbucks",  label:"Starbucks", sub:"Jan 12, 2022", amt:"-$150.00" },
    { brand:"transfer",   label:"Transfer",  sub:"Jan 16, 2022", amt:"-$85.00"  },
    { brand:"youtube",    label:"Youtube",   sub:"Jan 16, 2022", amt:"-$11.99"  },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      <NavBar title="Statistics" rightIcon="upload"/>

      <div style={{ flex:1, overflowY:"auto", padding:"0 20px 16px" }}>
        {/* period tabs */}
        <div style={{ display:"flex", background:WHITE, borderRadius:14, padding:4, marginBottom:14, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
          {["Day","Week","Month","Year"].map(p => (
            <Pill key={p} active={period===p} onClick={() => setPeriod(p)} style={{ flex:1 }}>{p}</Pill>
          ))}
        </div>

        {/* chart card */}
        <div style={{ background:WHITE, borderRadius:20, padding:"18px 16px 12px", marginBottom:14, boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
          {/* kind toggle */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
            <div style={{ display:"flex", border:`1.5px solid ${TEAL}`, borderRadius:20, overflow:"hidden" }}>
              {["Income","Expense"].map(k => (
                <button key={k} onClick={() => setKind(k)} style={{
                  padding:"5px 14px", border:"none", cursor:"pointer", fontSize:12, fontWeight:500,
                  background: kind===k ? TEAL : WHITE, color: kind===k ? WHITE : TEAL,
                }}>{k}</button>
              ))}
            </div>
          </div>

          {/* bars */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:110, paddingBottom:4 }}>
            {bars.map((b,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                {i===3 && (
                  <div style={{ background:TEAL, borderRadius:6, padding:"2px 5px", fontSize:9, color:WHITE, fontWeight:700, whiteSpace:"nowrap" }}>
                    $1,230
                  </div>
                )}
                <div style={{
                  width:"100%", height:b.h, borderRadius:"6px 6px 0 0",
                  background: i===3 ? TEAL : TEAL_DIM,
                  transition:"height 0.3s",
                }}/>
                <span style={{ fontSize:9, color:MID }}>{b.mo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* top spending */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:15, fontWeight:700, color:DARK }}>Top Spending</span>
          <Icon name="filter" size={18} color={MID}/>
        </div>

        {topSpend.map((tx, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:WHITE, borderRadius:16, padding:"13px 14px", marginBottom:10,
            boxShadow:"0 1px 8px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <BrandIcon brand={tx.brand} size={42}/>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:DARK }}>{tx.label}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:MID }}>{tx.sub}</p>
              </div>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:RED }}>{tx.amt}</span>
          </div>
        ))}
      </div>

      <BottomNav active="stats" go={go}/>
    </div>
  );
}

/* 4. ADD EXPENSE ------------------------------------------------------------ */
function AddExpense({ go }) {
  const [amount, setAmount] = useState("45.00");

  const press = (k) => {
    if (k === "⌫") { setAmount(a => a.length > 1 ? a.slice(0,-1) : "0"); return; }
    if (k === "." && amount.includes(".")) return;
    setAmount(a => (a === "0" && k !== ".") ? k : a + k);
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      <NavBar title="Add Expense" onBack={() => go("home")}/>

      <div style={{ flex:1, overflowY:"auto", padding:"10px 20px 20px" }}>
        {/* Name */}
        <div style={{ background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:10, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ margin:"0 0 4px", fontSize:10, color:MID, letterSpacing:0.8, fontWeight:600 }}>NAME</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:15, color:DARK, fontWeight:500 }}>Netflix</span>
            <Icon name="chevRight" size={16} color={MID}/>
          </div>
        </div>

        {/* Amount */}
        <div style={{ background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:10, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ margin:"0 0 4px", fontSize:10, color:MID, letterSpacing:0.8, fontWeight:600 }}>AMOUNT</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:20, fontWeight:700, color:DARK }}>$ {amount}</span>
            <button onClick={() => setAmount("0")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:TEAL, fontWeight:600 }}>Clear</button>
          </div>
        </div>

        {/* Date */}
        <div style={{ background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:10, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ margin:"0 0 4px", fontSize:10, color:MID, letterSpacing:0.8, fontWeight:600 }}>DATE</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:14, color:DARK }}>Tue, 22 Feb 2022</span>
            <Icon name="calendar" size={17} color={MID}/>
          </div>
        </div>

        {/* Invoice */}
        <div style={{ background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:18, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ margin:"0 0 8px", fontSize:10, color:MID, letterSpacing:0.8, fontWeight:600 }}>INVOICE</p>
          <button style={{
            display:"flex", alignItems:"center", gap:6, background:"none",
            border:`1.5px dashed #D1D5DB`, borderRadius:10, padding:"8px 14px",
            cursor:"pointer", color:MID, fontSize:13,
          }}>
            <Icon name="plus" size={14} color={MID}/> Add Invoice
          </button>
        </div>

        {/* Numpad */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(k => (
            <button key={k} onClick={() => press(k)} style={{
              padding:"17px 0", background:WHITE, border:"none", borderRadius:16,
              fontSize: k==="⌫" ? 18 : 22, fontWeight:500, cursor:"pointer", color:DARK,
              boxShadow:"0 1px 6px rgba(0,0,0,0.07)",
            }}>{k}</button>
          ))}
        </div>

        <button onClick={() => go("home")} style={{
          width:"100%", padding:"17px", background:TEAL, color:WHITE,
          border:"none", borderRadius:32, fontSize:16, fontWeight:700, cursor:"pointer",
          boxShadow:`0 6px 20px ${TEAL}55`,
        }}>Add Expense</button>
      </div>
    </div>
  );
}

/* 5. PROFILE --------------------------------------------------------------- */
function Profile({ go }) {
  const menu = [
    { icon:"invite",   label:"Invite Friends"   },
    { icon:"info",     label:"Account Info"     },
    { icon:"user",     label:"Personal Profile" },
    { icon:"message",  label:"Message Center"   },
    { icon:"lock",     label:"Login and Security"},
    { icon:"shield",   label:"Data and Privacy" },
  ];
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      {/* teal header */}
      <div style={{ background:TEAL, padding:"48px 20px 56px", borderRadius:"0 0 32px 32px", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:24 }}>
          <Icon name="dots" size={22} color={WHITE}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{
            width:76, height:76, borderRadius:38, background:WHITE,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:38,
            boxShadow:"0 4px 18px rgba(0,0,0,0.18)",
          }}>🧑‍💼</div>
          <p style={{ margin:0, fontSize:18, fontWeight:700, color:WHITE }}>Enjelin Morgeana</p>
          <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.7)" }}>@enjelin_morgeana</p>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 10px" }}>
        {menu.map((item, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:8,
            cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{
                width:38, height:38, borderRadius:19,
                background:TEAL_DIM, display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Icon name={item.icon} size={18} color={TEAL}/>
              </div>
              <span style={{ fontSize:14, fontWeight:500, color:DARK }}>{item.label}</span>
            </div>
            <Icon name="chevRight" size={18} color={MID}/>
          </div>
        ))}
      </div>

      <BottomNav active="profile" go={go}/>
    </div>
  );
}

/* 6. WALLET ----------------------------------------------------------------- */
function Wallet({ go }) {
  const [tab, setTab] = useState("transactions");
  const txns = [
    { brand:"youtube",     label:"Youtube",    sub:"Mar 26, 2022", amt:"-$11.99",  pos:false, bill:true },
    { brand:"electricity", label:"Electricity",sub:"Mar 28, 2022", amt:"-$67.00",  pos:false, bill:true },
    { brand:"rent",        label:"House Rent", sub:"Mar 30, 2022", amt:"-$850.00", pos:false, bill:true },
    { brand:"spotify",     label:"Spotify",    sub:"Feb 28, 2022", amt:"-$11.99",  pos:false, bill:true },
  ];
  const history = [
    { brand:"upwork",   label:"Upwork",   sub:"Today",        amt:"+$850.00",   pos:true  },
    { brand:"transfer", label:"Transfer", sub:"Yesterday",    amt:"-$85.00",    pos:false },
    { brand:"paypal",   label:"Paypal",   sub:"Jan 30, 2022", amt:"+$1,406.00", pos:true  },
    { brand:"youtube",  label:"Youtube",  sub:"Jan 15, 2022", amt:"-$11.99",    pos:false },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      {/* hero */}
      <div style={{ background:TEAL, padding:"48px 22px 50px", borderRadius:"0 0 32px 32px", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:17, fontWeight:700, color:WHITE }}>Wallet</span>
          <button style={{ background:"none", border:"none", cursor:"pointer" }}>
            <Icon name="bell" size={20} color={WHITE}/>
          </button>
        </div>
        <p style={{ margin:"0 0 2px", textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.7)" }}>Total Balance</p>
        <p style={{ margin:"0 0 22px", textAlign:"center", fontSize:34, fontWeight:800, color:WHITE, letterSpacing:-1 }}>$2,548.00</p>
        <div style={{ display:"flex", justifyContent:"center", gap:38 }}>
          {[
            { icon:"add",  label:"Add"  },
            { icon:"card", label:"Pay"  },
            { icon:"send", label:"Send" },
          ].map(a => (
            <div key={a.label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
              <div style={{
                width:48, height:48, borderRadius:24,
                background:"rgba(255,255,255,0.2)",
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
              }}>
                <Icon name={a.icon} size={20} color={WHITE}/>
              </div>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"18px 20px 10px" }}>
        {/* tab bar */}
        <div style={{ display:"flex", borderBottom:`2px solid #E5E7EB`, marginBottom:14 }}>
          {[["transactions","Transactions"],["upcoming","Upcoming Bills"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background:"none", border:"none", cursor:"pointer",
              paddingBottom:10, paddingRight:18, fontSize:13,
              fontWeight: tab===k ? 700 : 400, color: tab===k ? DARK : MID,
              borderBottom: tab===k ? `2px solid ${TEAL}` : "2px solid transparent",
              marginBottom:-2,
            }}>{l}</button>
          ))}
        </div>

        {(tab === "transactions" ? history : txns).map((tx, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:WHITE, borderRadius:16, padding:"13px 14px", marginBottom:10,
            boxShadow:"0 1px 8px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <BrandIcon brand={tx.brand} size={42}/>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:DARK }}>{tx.label}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:MID }}>{tx.sub}</p>
              </div>
            </div>
            {tab === "upcoming"
              ? <button onClick={() => go("billDetail")} style={{
                  background:TEAL_DIM, color:TEAL, border:`1px solid ${TEAL}`,
                  borderRadius:20, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer",
                }}>Pay</button>
              : <span style={{ fontSize:14, fontWeight:700, color: tx.pos ? GREEN : RED }}>{tx.amt}</span>
            }
          </div>
        ))}

        <button onClick={() => go("connectWallet")} style={{
          width:"100%", padding:"16px", background:TEAL, color:WHITE,
          border:"none", borderRadius:32, fontSize:14, fontWeight:700, cursor:"pointer",
          marginTop:8, boxShadow:`0 4px 14px ${TEAL}44`,
        }}>+ Connect Wallet</button>
      </div>

      <BottomNav active="wallet" go={go}/>
    </div>
  );
}

/* 7. CONNECT WALLET --------------------------------------------------------- */
function ConnectWallet({ go }) {
  const [tab, setTab] = useState("Cards");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      <NavBar title="Connect Wallet" onBack={() => go("wallet")}/>

      <div style={{ flex:1, overflowY:"auto", padding:"10px 20px 16px" }}>
        {/* tab switcher */}
        <div style={{ display:"flex", background:WHITE, borderRadius:14, padding:4, marginBottom:16, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
          {["Cards","Accounts"].map(t => (
            <Pill key={t} active={tab===t} onClick={() => setTab(t)} style={{ flex:1 }}>{t}</Pill>
          ))}
        </div>

        {tab === "Cards" ? (
          <>
            {/* card visual */}
            <div style={{
              background:`linear-gradient(135deg, #1ACFB5, ${TEAL})`,
              borderRadius:22, padding:"22px 22px", marginBottom:18, color:WHITE,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:32 }}>
                <span style={{ fontSize:11, opacity:0.8 }}>Select Card</span>
                <span style={{ fontSize:13, fontWeight:800, letterSpacing:3 }}>mono</span>
              </div>
              <p style={{ margin:"0 0 20px", fontFamily:"monospace", fontSize:15, letterSpacing:3 }}>
                4519  8456  2008  8075
              </p>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, opacity:0.85 }}>
                <span>IRWAN MOSES</span><span>23/26</span>
              </div>
            </div>

            <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:700, color:DARK }}>Add your debit Card</p>
            <p style={{ margin:"0 0 16px", fontSize:12, color:MID, lineHeight:1.5 }}>
              The card must be connected to a bank account under your name
            </p>

            {[
              { label:"NAME ON CARD",   ph:"IRWAN MOSES",        flex:1 },
              { label:"CARD NUMBER",    ph:"•••• •••• •••• ••••",flex:1 },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:12 }}>
                <p style={{ margin:"0 0 5px", fontSize:10, color:MID, letterSpacing:0.8, fontWeight:600 }}>{f.label}</p>
                <input placeholder={f.ph} style={{
                  width:"100%", padding:"13px 14px", border:"1.5px solid #E5E7EB", borderRadius:12,
                  fontSize:14, color:DARK, outline:"none", boxSizing:"border-box", background:WHITE,
                }}/>
              </div>
            ))}

            <div style={{ display:"flex", gap:12, marginBottom:10 }}>
              {[{ label:"EXPIRY DATE", ph:"MM/YY" },{ label:"CVV", ph:"•••" }].map(f => (
                <div key={f.label} style={{ flex:1 }}>
                  <p style={{ margin:"0 0 5px", fontSize:10, color:MID, letterSpacing:0.8, fontWeight:600 }}>{f.label}</p>
                  <input placeholder={f.ph} style={{
                    width:"100%", padding:"13px 14px", border:"1.5px solid #E5E7EB", borderRadius:12,
                    fontSize:14, color:DARK, outline:"none", boxSizing:"border-box", background:WHITE,
                  }}/>
                </div>
              ))}
            </div>
          </>
        ) : (
          [
            { brand:"bank",  name:"Bank Link",     desc:"Connect your bank account to deposit & fund", on:true  },
            { brand:"micro", name:"Microdeposits", desc:"Connect bank in 1–7 days",                   on:false },
            { brand:"paypal",name:"Paypal",         desc:"Connect your paypal account",                on:false },
          ].map((acc, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:10,
              boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <BrandIcon brand={acc.brand} size={42}/>
                <div>
                  <p style={{ margin:0, fontSize:13, fontWeight:600, color:DARK }}>{acc.name}</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:MID }}>{acc.desc}</p>
                </div>
              </div>
              <div style={{
                width:24, height:24, borderRadius:12,
                background: acc.on ? TEAL : WHITE,
                border: `2px solid ${acc.on ? TEAL : "#D1D5DB"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {acc.on && <Icon name="check" size={12} color={WHITE}/>}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding:"12px 20px 28px", background:LIGHT, flexShrink:0 }}>
        <button onClick={() => go("wallet")} style={{
          width:"100%", padding:"17px", background:TEAL, color:WHITE,
          border:"none", borderRadius:32, fontSize:16, fontWeight:700, cursor:"pointer",
          boxShadow:`0 6px 20px ${TEAL}55`,
        }}>Next</button>
      </div>
    </div>
  );
}

/* 8. TRANSACTION DETAIL ----------------------------------------------------- */
function TxDetail({ go }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      <NavBar title="Transaction Details" onBack={() => go("home")}/>

      <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
        {/* amount card */}
        <div style={{ background:WHITE, borderRadius:20, padding:"28px 20px", textAlign:"center", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <BrandIcon brand="upwork" size={56}/>
          <p style={{ margin:"14px 0 4px", fontSize:12, fontWeight:600, color:GREEN }}>Income</p>
          <p style={{ margin:0, fontSize:34, fontWeight:800, color:DARK, letterSpacing:-1 }}>$850.00</p>
        </div>

        {/* detail card */}
        <div style={{ background:WHITE, borderRadius:20, padding:"18px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:14, fontWeight:700, color:DARK }}>Transaction details</span>
            <Icon name="arrowUp" size={16} color={MID}/>
          </div>
          {[
            { l:"Status", v:"Income",        vc:GREEN },
            { l:"From",   v:"Upwork Escrow"           },
            { l:"Time",   v:"10:00 AM"                },
            { l:"Date",   v:"Feb 30, 2022"            },
          ].map(r => (
            <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6" }}>
              <span style={{ fontSize:13, color:MID }}>{r.l}</span>
              <span style={{ fontSize:13, fontWeight:600, color: r.vc || DARK }}>{r.v}</span>
            </div>
          ))}
          <div style={{ paddingTop:8 }}>
            {[
              { l:"Earnings", v:"$870.00"  },
              { l:"Fee",      v:"-$20.00"  },
              { l:"Total",    v:"$850.00", bold:true },
            ].map(r => (
              <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0" }}>
                <span style={{ fontSize:13, color:MID }}>{r.l}</span>
                <span style={{ fontSize:13, fontWeight: r.bold ? 800 : 500, color:DARK }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        <button style={{
          width:"100%", padding:"16px", background:WHITE,
          border:`1.5px solid ${TEAL}`, borderRadius:32,
          color:TEAL, fontSize:14, fontWeight:700, cursor:"pointer", marginTop:16,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <Icon name="download" size={16} color={TEAL}/> Download Receipt
        </button>
      </div>

      <BottomNav active="home" go={go}/>
    </div>
  );
}

/* 9. BILL DETAIL ------------------------------------------------------------ */
function BillDetail({ go }) {
  const [method, setMethod] = useState("debit");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      <NavBar title="Bill Details" onBack={() => go("wallet")}/>

      <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
        <div style={{ background:WHITE, borderRadius:20, padding:"18px 16px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, paddingBottom:12, borderBottom:"1px solid #F3F4F6", marginBottom:8 }}>
            <BrandIcon brand="youtube" size={42}/>
            <div>
              <p style={{ margin:0, fontSize:14, fontWeight:600, color:DARK }}>Youtube Premium</p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:MID }}>Feb 26, 2022</p>
            </div>
          </div>
          {[
            { l:"Price", v:"$11.99" },
            { l:"Fee",   v:"$1.99"  },
            { l:"Total", v:"$13.98", bold:true },
          ].map(r => (
            <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #F9FAFB" }}>
              <span style={{ fontSize:13, color:MID }}>{r.l}</span>
              <span style={{ fontSize:13, fontWeight: r.bold ? 800 : 500, color:DARK }}>{r.v}</span>
            </div>
          ))}
        </div>

        <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:700, color:DARK }}>Select payment method</p>

        {[
          { k:"debit",  brand:"paypal",   label:"Debit Card", bg:"#0070E0" },
          { k:"paypal", brand:"paypal",   label:"Paypal"                   },
        ].map(m => (
          <div key={m.k} onClick={() => setMethod(m.k)} style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:WHITE, borderRadius:16, padding:"14px 16px", marginBottom:10,
            cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
            border: method===m.k ? `1.5px solid ${TEAL}` : "1.5px solid transparent",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <BrandIcon brand={m.k==="debit" ? "bank" : "paypal"} size={42}/>
              <span style={{ fontSize:14, fontWeight:500, color:DARK }}>{m.label}</span>
            </div>
            <div style={{
              width:22, height:22, borderRadius:11,
              border:`2px solid ${method===m.k ? TEAL : "#D1D5DB"}`,
              background: method===m.k ? TEAL : WHITE,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {method===m.k && <div style={{ width:8, height:8, borderRadius:4, background:WHITE }}/>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:"12px 20px 28px", background:LIGHT, flexShrink:0 }}>
        <button onClick={() => go("paySuccess")} style={{
          width:"100%", padding:"17px", background:TEAL, color:WHITE,
          border:"none", borderRadius:32, fontSize:16, fontWeight:700, cursor:"pointer",
          boxShadow:`0 6px 20px ${TEAL}55`,
        }}>Pay Now</button>
      </div>
    </div>
  );
}

/* 10. PAYMENT SUCCESS ------------------------------------------------------- */
function PaySuccess({ go }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:LIGHT, overflow:"hidden" }}>
      <NavBar title="Bill Payment" onBack={() => go("wallet")}/>

      <div style={{ flex:1, overflowY:"auto", padding:"28px 20px" }}>
        {/* success badge */}
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{
            width:72, height:72, borderRadius:36, background:TEAL,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 14px", boxShadow:`0 8px 24px ${TEAL}55`,
          }}>
            <Icon name="check" size={30} color={WHITE}/>
          </div>
          <p style={{ margin:0, fontSize:18, fontWeight:800, color:DARK }}>Payment Successfully</p>
          <p style={{ margin:"4px 0 0", fontSize:13, color:MID }}>Youtube Premium</p>
        </div>

        {/* detail card */}
        <div style={{ background:WHITE, borderRadius:20, padding:"18px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:700, color:DARK }}>Transaction details</p>
          {[
            { l:"Payment method", v:"Debit Card"           },
            { l:"Status",         v:"Completed", vc:GREEN  },
            { l:"Time",           v:"08:15 AM"             },
            { l:"Date",           v:"Feb 28, 2022"         },
            { l:"Transaction ID", v:"2092913832472..."      },
          ].map(r => (
            <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #F3F4F6" }}>
              <span style={{ fontSize:12, color:MID }}>{r.l}</span>
              <span style={{ fontSize:12, fontWeight:600, color: r.vc || DARK }}>{r.v}</span>
            </div>
          ))}
          <div style={{ paddingTop:8 }}>
            {[
              { l:"Price", v:"$11.99" },
              { l:"Fee",   v:"-$1.99" },
              { l:"Total", v:"$13.98", bold:true },
            ].map(r => (
              <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0" }}>
                <span style={{ fontSize:12, color:MID }}>{r.l}</span>
                <span style={{ fontSize:12, fontWeight: r.bold ? 800 : 500, color:DARK }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        <button style={{
          width:"100%", padding:"16px", background:WHITE,
          border:`1.5px solid ${TEAL}`, borderRadius:32,
          color:TEAL, fontSize:14, fontWeight:700, cursor:"pointer", marginTop:16,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <Icon name="share" size={16} color={TEAL}/> Share Receipt
        </button>
      </div>

      <BottomNav active="wallet" go={go}/>
    </div>
  );
}

/* ── ROOT ─────────────────────────────────────────────────────────────────── */
export default function MonoApp() {
  const [screen, setScreen] = useState("splash");
  const go = (s) => setScreen(s);

  const map = {
    splash:        <Splash        go={go}/>,
    home:          <Home          go={go}/>,
    stats:         <Stats         go={go}/>,
    addExpense:    <AddExpense    go={go}/>,
    profile:       <Profile       go={go}/>,
    wallet:        <Wallet        go={go}/>,
    txDetail:      <TxDetail      go={go}/>,
    connectWallet: <ConnectWallet go={go}/>,
    billDetail:    <BillDetail    go={go}/>,
    paySuccess:    <PaySuccess    go={go}/>,
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(140deg, #0f2027, #203a43, #2c5364)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"20px",
      fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* phone shell */}
      <div style={{
        width:375, height:812,
        borderRadius:50, overflow:"hidden",
        boxShadow:"0 40px 100px rgba(0,0,0,0.55)",
        display:"flex", flexDirection:"column",
        border:"9px solid #1a1a1a",
        background:WHITE, flexShrink:0, position:"relative",
      }}>
        {/* notch */}
        <div style={{
          position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
          width:120, height:28, background:"#1a1a1a", borderRadius:"0 0 20px 20px",
          zIndex:10,
        }}/>
        {map[screen] ?? <Home go={go}/>}
      </div>
    </div>
  );
}
