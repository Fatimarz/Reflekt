import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — Soft & Dreamy
   Primary:   #7C5CBF  deep lavender
   Accent:    #E8A0BF  rose pink
   Surface:   #FAF8FF  near-white lavender tint
   Card:      #FFFFFF
   Border:    #EDE8F7
   Text:      #1E1535  deep plum
   Subtle:    #9B92B8  muted lavender
═══════════════════════════════════════════════════ */

const T = {
  primary:    "#7C5CBF",
  primaryDark:"#5E3F9E",
  accent:     "#E8A0BF",
  accentSoft: "#FCE8F3",
  surface:    "#FAF8FF",
  card:       "#FFFFFF",
  border:     "#EDE8F7",
  text:       "#1E1535",
  subtle:     "#9B92B8",
  muted:      "#C4BCDE",
  success:    "#6DBF9E",
  error:      "#E07070",
  gradient:   "linear-gradient(135deg, #7C5CBF 0%, #E8A0BF 100%)",
  gradientSoft:"linear-gradient(135deg, #F0EAFF 0%, #FCE8F3 100%)",
};

/* ══════════════════════════════════════════
   AUTH PAGE
══════════════════════════════════════════ */
function AuthPage({ onLogin }) {
  const [mode, setMode]         = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const reset = () => { setUsername(""); setEmail(""); setPassword(""); setConfirm(""); setError(""); };
  const switchMode = (m) => { setMode(m); reset(); };

  const handleDemoLogin = async () => {
    setDemoLoading(true); setError("");
    try {
      const res  = await fetch("http://127.0.0.1:8000/auth/demo-login", { method: "POST" });
      const data = await res.json();
      if (data.access_token) {
        onLogin(data.access_token, "demo_user");
      } else {
        setError("Demo account is not available right now.");
      }
    } catch {
      setError("Could not reach the server. Is it running?");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) return setError("Please fill in all fields.");
    setLoading(true); setError("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);
      const res  = await fetch("http://127.0.0.1:8000/auth/token", { method: "POST", body: formData });
      const data = await res.json();
      if (data.access_token) {
        onLogin(data.access_token, username);
      } else {
        setError("Incorrect username or password.");
      }
    } catch {
      setError("Could not reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!username || !password || !confirm) return setError("Please fill in all required fields.");
    if (password !== confirm) return setError("Passwords don't match.");
    if (password.length < 6)  return setError("Password must be at least 6 characters.");
    setLoading(true); setError("");
    try {
      const body = { username, password };
      if (email.trim()) body.email = email.trim(); // email is optional

      const res  = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);
        const loginRes  = await fetch("http://127.0.0.1:8000/auth/token", { method: "POST", body: formData });
        const loginData = await loginRes.json();
        if (loginData.access_token) {
          onLogin(loginData.access_token, username);
        } else {
          switchMode("login");
        }
      } else {
        setError(data.detail || "Sign up failed. Username may already exist.");
      }
    } catch {
      setError("Could not reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const submit = mode === "login" ? handleLogin : handleSignup;

  return (
    <div style={auth.page}>
      <div style={auth.left}>
        <div style={auth.brand}>
          <i className="ti ti-notebook" style={{ fontSize: 22, color: "#fff" }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Reflekt</span>
        </div>
        <div style={auth.leftBody}>
          <div style={auth.tagline}>Your thoughts,<br />understood.</div>
          <div style={auth.subTagline}>Write daily. Discover patterns. Talk to your past self.</div>
          <div style={auth.featureList}>
            {["Daily journaling, simplified", "AI-powered personal insights", "Chat with who you were"].map((f) => (
              <div key={f} style={auth.featureItem}>
                <div style={auth.featureDot} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={auth.right}>
        <div style={auth.card}>
          <div style={auth.tabs}>
            <button onClick={() => switchMode("login")}  style={{ ...auth.tab, ...(mode === "login"  ? auth.tabActive : {}) }}>Sign in</button>
            <button onClick={() => switchMode("signup")} style={{ ...auth.tab, ...(mode === "signup" ? auth.tabActive : {}) }}>Create account</button>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={auth.cardTitle}>{mode === "login" ? "Welcome back" : "Start your journal"}</div>
            <div style={auth.cardSub}>{mode === "login" ? "Sign in to continue." : "Free forever. No credit card needed."}</div>
          </div>

          {error && (
            <div style={auth.errorBox}>
              <i className="ti ti-alert-circle" style={{ fontSize: 14, flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={auth.label}>Username <span style={auth.required}>*</span></label>
              <input placeholder="e.g. ali_hassan" value={username}
                onChange={(e) => setUsername(e.target.value)} style={auth.input}
                onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            {mode === "signup" && (
              <div>
                <label style={auth.label}>Email <span style={auth.optional}>(optional)</span></label>
                <input placeholder="you@example.com" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} style={auth.input} />
              </div>
            )}
            <div>
              <label style={auth.label}>Password <span style={auth.required}>*</span></label>
              <input placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} style={auth.input}
                onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            {mode === "signup" && (
              <div>
                <label style={auth.label}>Confirm password <span style={auth.required}>*</span></label>
                <input placeholder="Repeat your password" type="password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} style={auth.input}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            )}
          </div>

          <button onClick={submit} style={{ ...auth.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <div style={auth.switchRow}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <span onClick={() => switchMode(mode === "login" ? "signup" : "login")} style={auth.switchLink}>
              {mode === "login" ? " Create one" : " Sign in"}
            </span>
          </div>

          <div style={auth.demoDivider}>
            <div style={auth.demoDividerLine} />
            <span style={auth.demoDividerText}>or</span>
            <div style={auth.demoDividerLine} />
          </div>

          <button onClick={handleDemoLogin} style={{ ...auth.demoBtn, opacity: demoLoading ? 0.7 : 1 }} disabled={demoLoading}>
            <i className="ti ti-sparkles" style={{ fontSize: 14 }} />
            {demoLoading ? "Loading demo..." : "Try the demo — no signup needed"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   INSIGHT CARD
══════════════════════════════════════════ */
function InsightCard({ token }) {
  const [insight, setInsight] = useState("");
  const [status, setStatus]   = useState("loading");

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const res  = await fetch("http://127.0.0.1:8000/journal/insight", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.insight) { setInsight(data.insight); setStatus("ready"); }
        else setStatus("empty");
      } catch { setStatus("error"); }
    };
    fetchInsight();
  }, [token]);

  if (status === "empty") return null;

  return (
    <div style={ic.card}>
      <div style={ic.accentBar} />
      <div style={ic.inner}>
        <div style={ic.iconWrap}>
          <i className="ti ti-bulb" style={{ fontSize: 20, color: T.primary }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={ic.label}>
            <i className="ti ti-sparkles" style={{ fontSize: 11 }} /> Today's pattern
          </div>
          {status === "loading" && (
            <div style={ic.skeletonWrap}>
              <div style={{ ...ic.skeleton, width: "92%" }} />
              <div style={{ ...ic.skeleton, width: "70%", marginTop: 6 }} />
            </div>
          )}
          {status === "ready"   && <div style={ic.insightText}>{insight}</div>}
          {status === "error"   && <div style={{ ...ic.insightText, color: T.muted, fontStyle: "italic" }}>Could not load insight right now.</div>}
          <div style={ic.footer}>Refreshes daily</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   INSIGHTS DASHBOARD
══════════════════════════════════════════ */
function InsightsDashboard({ token }) {
  const [data, setData]                   = useState(null);
  const [status, setStatus]               = useState("loading");
  const [reflectionOpen, setReflectionOpen] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res  = await fetch("http://127.0.0.1:8000/journal/insights-dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.data) { setData(json.data); setStatus("ready"); }
        else setStatus("empty");
      } catch { setStatus("error"); }
    };
    fetch_();
  }, [token]);

  if (status === "loading") return (
    <div style={idd.page}>
      <div style={idd.pageHeader}><div style={idd.pageTitle}>Your Insights</div><div style={idd.pageSubtitle}>Patterns and reflections from your journal</div></div>
      <div style={idd.grid}>{[1,2,3,4].map(i => (<div key={i} style={idd.card}><div style={{...idd.skeleton,width:"50%",height:12,marginBottom:16}}/><div style={{...idd.skeleton,width:"90%",height:13,marginBottom:8}}/><div style={{...idd.skeleton,width:"70%",height:13}}/></div>))}</div>
    </div>
  );

  if (status === "empty" || status === "error") return (
    <div style={idd.page}>
      <div style={idd.pageHeader}><div style={idd.pageTitle}>Your Insights</div><div style={idd.pageSubtitle}>Patterns and reflections from your journal</div></div>
      <div style={idd.emptyFull}><i className="ti ti-notebook" style={{fontSize:32,color:T.muted,marginBottom:12}}/><div style={{fontWeight:600,color:T.primary,marginBottom:6}}>No insights yet</div><div style={{fontSize:13,color:T.subtle,maxWidth:260,textAlign:"center",lineHeight:1.6}}>Write a few journal entries and come back.</div></div>
    </div>
  );

  const hasData = (val) => { if (val === null || val === undefined) return false; if (Array.isArray(val)) return val.length > 0; if (typeof val === "string") return val.trim().length > 0; return false; };
  const { gratitude_wins, top_topics, recurring_thought, reflection } = data;

  return (
    <div style={idd.page}>
      <div style={idd.pageHeader}><div style={idd.pageTitle}>Your Insights</div><div style={idd.pageSubtitle}>Patterns and reflections from your journal · refreshes daily</div></div>
      <div style={idd.grid}>

        <div style={idd.card}>
          <div style={idd.cardTop}>
            <div style={{...idd.iconWrap,background:"#FFF7ED",border:"1px solid #fde6c4"}}><i className="ti ti-trophy" style={{fontSize:17,color:"#D97706"}}/></div>
            <div><div style={idd.cardLabel}>Gratitude & Wins</div><div style={idd.cardHint}>Things worth celebrating</div></div>
          </div>
          {hasData(gratitude_wins) ? (
            <div style={idd.tagList}>{gratitude_wins.map((item,i)=>(<div key={i} style={idd.winTag}><i className="ti ti-star" style={{fontSize:11,color:"#D97706"}}/>{item}</div>))}</div>
          ) : <div style={idd.unlockMsg}><i className="ti ti-pencil" style={{fontSize:13}}/>Write more to unlock this insight</div>}
        </div>

        <div style={idd.card}>
          <div style={idd.cardTop}>
            <div style={{...idd.iconWrap,background:"#EFF6FF",border:"1px solid #bfdbfe"}}><i className="ti ti-tags" style={{fontSize:17,color:"#2563EB"}}/></div>
            <div><div style={idd.cardLabel}>Top Topics</div><div style={idd.cardHint}>What you think about most</div></div>
          </div>
          {hasData(top_topics) ? (
            <div style={idd.topicList}>{top_topics.slice(0,3).map((topic,i)=>(<div key={i} style={idd.topicRow}><div style={{...idd.topicBar,width:`${100-i*22}%`,opacity:1-i*0.2}}/><span style={idd.topicLabel}>{topic}</span></div>))}</div>
          ) : <div style={idd.unlockMsg}><i className="ti ti-pencil" style={{fontSize:13}}/>Write more to unlock this insight</div>}
        </div>

        <div style={idd.card}>
          <div style={idd.cardTop}>
            <div style={{...idd.iconWrap,background:"#F5F3FF",border:"1px solid #ddd6fe"}}><i className="ti ti-refresh" style={{fontSize:17,color:T.primary}}/></div>
            <div><div style={idd.cardLabel}>Recurring Thought</div><div style={idd.cardHint}>What keeps coming back</div></div>
          </div>
          {hasData(recurring_thought) ? <div style={idd.thoughtText}>"{recurring_thought}"</div> : <div style={idd.unlockMsg}><i className="ti ti-pencil" style={{fontSize:13}}/>Write more to unlock this insight</div>}
        </div>

        <div style={idd.card}>
          <div style={idd.cardTop}>
            <div style={{...idd.iconWrap,background:"#F0FDF4",border:"1px solid #bbf7d0"}}><i className="ti ti-eye" style={{fontSize:17,color:"#16A34A"}}/></div>
            <div><div style={idd.cardLabel}>Reflection</div><div style={idd.cardHint}>A deeper look</div></div>
          </div>
          {hasData(reflection) ? (
            reflectionOpen ? (
              <div><div style={idd.reflectionText}>{reflection}</div><button onClick={()=>setReflectionOpen(false)} style={idd.revealBtn}>Hide reflection</button></div>
            ) : (
              <button onClick={()=>setReflectionOpen(true)} style={idd.revealBtn}><i className="ti ti-lock-open" style={{fontSize:13}}/>Click to see reflection</button>
            )
          ) : <div style={idd.unlockMsg}><i className="ti ti-pencil" style={{fontSize:13}}/>Write more to unlock this insight</div>}
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAST SELF CHAT  — with streaming
══════════════════════════════════════════ */
function PastSelfChat({ token }) {
  const [sessions, setSessions]   = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [view, setView]           = useState("chat");
  const [embedding, setEmbedding] = useState(false);
  const messagesEndRef            = useRef(null);
  const fileInputRef              = useRef(null);

  const STARTERS = [
    "What were you most stressed about?",
    "What made you happy back then?",
    "What do you wish you had done differently?",
    "What were you hopeful about?",
  ];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => { embedJournals(); fetchSessions(); }, []);

  const embedJournals = async () => {
    setEmbedding(true);
    try { await fetch("http://127.0.0.1:8000/journal/embed-journals", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); }
    catch {}
    finally { setEmbedding(false); }
  };

  const fetchSessions = async () => {
    try {
      const res  = await fetch("http://127.0.0.1:8000/journal/chat/sessions", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadSession = async (id) => {
    try {
      const res  = await fetch(`http://127.0.0.1:8000/journal/chat/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMessages(data.messages || []);
      setSessionId(id);
      setView("chat");
    } catch {}
  };

  // ── Streaming send ────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("http://127.0.0.1:8000/journal/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: msg, session_id: sessionId }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   sid     = sessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Extract session_id from the final metadata chunk
        const sidMatch = buffer.match(/\[SESSION_ID:(\d+)\]/);
        if (sidMatch) {
          sid    = parseInt(sidMatch[1]);
          buffer = buffer.replace(sidMatch[0], "");
          if (!sessionId) { setSessionId(sid); fetchSessions(); }
        }

        // Stream text into last message
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: buffer };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Try again." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => { setSessionId(null); setMessages([]); setView("chat"); };

  const deleteSession = async (id, e) => {
    e.stopPropagation(); // don't trigger loadSession
    try {
      await fetch(`http://127.0.0.1:8000/journal/chat/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== id));
      // If the deleted session was open, reset to a fresh chat
      if (sessionId === id) { setSessionId(null); setMessages([]); }
    } catch {}
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res  = await fetch("http://127.0.0.1:8000/journal/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      setImportMsg(data.message || data.error || "Done");
    } catch { setImportMsg("Import failed. Try again."); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  if (view === "history") return (
    <div style={ps.page}>
      <button onClick={() => setView("chat")} style={ps.backBtn}><i className="ti ti-arrow-left" style={{fontSize:14}}/> Back</button>
      <div style={ps.pageTitle}>Past conversations</div>
      <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
        {sessions.length === 0 ? <div style={ps.empty}>No conversations yet.</div> : sessions.map(s=>(
          <div key={s.id} onClick={()=>loadSession(s.id)} style={ps.sessionCard}>
            <i className="ti ti-message-circle" style={{fontSize:15,color:T.primary,flexShrink:0}}/>
            <div style={{flex:1}}><div style={ps.sessionTitle}>{s.title||"Conversation"}</div><div style={ps.sessionDate}>{s.created_at?new Date(s.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}</div></div>
            <button onClick={(e)=>deleteSession(s.id,e)} style={ps.deleteSessionBtn} title="Delete conversation">
              <i className="ti ti-trash" style={{fontSize:14}}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={ps.page}>
      <div style={ps.header}>
        <div>
          <div style={ps.pageTitle}>Past Self</div>
          <div style={ps.pageSubtitle}>{embedding ? "Preparing your memories..." : "Talk to who you were"}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>fileInputRef.current?.click()} style={ps.importBtn} disabled={importing}>
            <i className="ti ti-upload" style={{fontSize:13}}/>{importing?"Importing...":"Import notes"}
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.docx" style={{display:"none"}} onChange={handleImport}/>
          <button onClick={()=>setView("history")} style={ps.iconBtn}><i className="ti ti-history" style={{fontSize:13}}/></button>
          {messages.length > 0 && <button onClick={startNewChat} style={ps.iconBtn}><i className="ti ti-plus" style={{fontSize:13}}/></button>}
        </div>
      </div>

      {importMsg && (
        <div style={ps.importFeedback}><i className="ti ti-check" style={{fontSize:13,color:T.success}}/>{importMsg}</div>
      )}

      <div style={ps.messagesWrap}>
        {messages.length === 0 && (
          <div style={ps.starterWrap}>
            <div style={ps.starterLabel}>What do you want to ask?</div>
            <div style={ps.starterGrid}>
              {STARTERS.map(s=>(<button key={s} onClick={()=>sendMessage(s)} style={ps.starterBtn}>{s}</button>))}
            </div>
          </div>
        )}

        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:12,alignItems:"flex-end",gap:8}}>
            {m.role==="assistant" && <div style={ps.avatarBubble}><i className="ti ti-user" style={{fontSize:12,color:T.primary}}/></div>}
            <div style={m.role==="user"?ps.userBubble:ps.assistantBubble}>
              {m.content || (loading && i===messages.length-1 ? <span style={ps.cursor}>▋</span> : "")}
            </div>
          </div>
        ))}

        {loading && messages[messages.length-1]?.content === "" && (
          <div style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:12}}>
            <div style={ps.avatarBubble}><i className="ti ti-user" style={{fontSize:12,color:T.primary}}/></div>
            <div style={{...ps.assistantBubble,padding:"12px 16px"}}>
              <div style={{display:"flex",gap:4}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.muted,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}/>
      </div>

      <div style={ps.inputRow}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
          placeholder="Ask your past self something..." style={ps.input} disabled={loading||embedding}/>
        <button onClick={()=>sendMessage()} style={{...ps.sendBtn,opacity:input.trim()&&!loading?1:0.4}} disabled={!input.trim()||loading}>
          <i className="ti ti-send" style={{fontSize:16}}/>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function Dashboard({ token, username, onLogout }) {
  const [journals, setJournals]             = useState([]);
  const [journalsLoaded, setJournalsLoaded] = useState(false);
  const [content, setContent]               = useState("");
  const [activeNav, setActiveNav]           = useState("dashboard");
  const [editingId, setEditingId]           = useState(null);
  const [editContent, setEditContent]       = useState("");

  useEffect(() => { fetchJournals(); }, []);

  const fetchJournals = async () => {
    try {
      const res  = await fetch("http://127.0.0.1:8000/journal/", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setJournals(Array.isArray(data) ? data : []);
    } catch (err) { console.log("fetch error:", err); }
    finally { setJournalsLoaded(true); }
  };

  const addJournal = async () => {
    if (!content.trim()) return;
    try {
      const res  = await fetch("http://127.0.0.1:8000/journal/", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ content }),
      });
      const data = await res.json();
      setJournals(prev => [data, ...prev]);
      setContent("");
    } catch (err) { console.log("add error:", err); }
  };

  const deleteJournal = async (id) => {
    await fetch(`http://127.0.0.1:8000/journal/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setJournals(prev => prev.filter(j => j.id !== id));
  };

  const editJournal = async (id) => {
    if (!editContent.trim()) return;
    try {
      const res  = await fetch(`http://127.0.0.1:8000/journal/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      setJournals(prev => prev.map(j => j.id === id ? { ...j, content: data.content } : j));
      setEditingId(null); setEditContent("");
    } catch (err) { console.log("edit error:", err); }
  };

  const navItems = [
    { id: "dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
    { id: "entries",   icon: "ti-books",            label: "All entries" },
    { id: "insights",  icon: "ti-sparkles",         label: "Insights",   badge: "AI" },
    { id: "pastself",  icon: "ti-message-circle",   label: "Past Self",  badge: "AI" },
  ];

  const renderJournalCard = (j) => {
    const dateStr  = j.created_at
      ? new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleDateString();
    const isEditing = editingId === j.id;

    return (
      <div key={j.id} style={s.journalCard}>
        {isEditing ? (
          <div>
            <textarea value={editContent} onChange={e=>setEditContent(e.target.value)}
              style={{...s.composeInput,marginBottom:10}} rows={3} autoFocus/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>{setEditingId(null);setEditContent("");}} style={s.cancelEditBtn}>Cancel</button>
              <button onClick={()=>editJournal(j.id)} style={s.saveBtn}>Save</button>
            </div>
          </div>
        ) : (
          <div style={s.jcTop}>
            <div style={s.jcBody}>
              <div style={s.jcText}>{j.content}</div>
              <div style={s.jcMeta}>
                <span style={s.jcDate}><i className="ti ti-calendar" style={{fontSize:12}}/> {dateStr}</span>
              </div>
            </div>
            <button onClick={()=>{setEditingId(j.id);setEditContent(j.content);}} style={s.editBtn}><i className="ti ti-pencil"/></button>
            <button onClick={()=>deleteJournal(j.id)} style={s.delBtn}><i className="ti ti-x"/></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={s.app}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <i className="ti ti-notebook" style={{fontSize:18,color:T.primary}}/>
          Reflekt
        </div>
        <button onClick={()=>setActiveNav("dashboard")} style={s.newBtn}>
          <i className="ti ti-plus" style={{fontSize:15}}/> New entry
        </button>
        <div style={s.navSection}>Menu</div>
        {navItems.map(item=>(
          <div key={item.id} onClick={()=>setActiveNav(item.id)}
            style={{...s.navItem,...(activeNav===item.id?s.navItemActive:{})}}>
            <i className={`ti ${item.icon}`} style={{fontSize:16}}/>
            {item.label}
            {item.badge && <span style={s.aiBadge}>{item.badge}</span>}
          </div>
        ))}
        <div style={s.navDivider}/>
        <div onClick={()=>setActiveNav("settings")} style={{...s.navItem,...(activeNav==="settings"?s.navItemActive:{})}}>
          <i className="ti ti-settings" style={{fontSize:16}}/> Settings
        </div>
        <div style={s.sidebarFooter}>
          <div style={s.userRow}>
            <div style={s.avatar}>{username.slice(0,2).toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={s.userName}>{username}</div>
              <div style={s.userSub}>Free plan</div>
            </div>
            <button onClick={onLogout} style={s.logoutBtn}><i className="ti ti-logout" style={{fontSize:15}}/></button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        <div style={s.topbar}>
          <div style={s.pageTitle}>{{ dashboard:"Dashboard", entries:"All entries", insights:"Insights", pastself:"Past Self", settings:"Settings" }[activeNav]||""}</div>
          <div style={{display:"flex",gap:8}}>
            <button style={s.iconBtn}><i className="ti ti-search" style={{fontSize:15}}/></button>
            <button style={s.iconBtn}><i className="ti ti-bell"   style={{fontSize:15}}/></button>
          </div>
        </div>

        <div style={s.scroll}>

          {activeNav === "dashboard" && (
            <>
              <InsightCard token={token}/>
              <div style={s.composeBox}>
                <div style={s.composeLabel}>What's on your mind today?</div>
                <textarea value={content} onChange={e=>setContent(e.target.value)}
                  placeholder="Write freely — no rules here..." style={s.composeInput} rows={4}/>
                <div style={s.composeFooter}>
                  <button onClick={addJournal} style={{...s.saveBtn,opacity:content.trim()?1:0.5}} disabled={!content.trim()}>
                    Save entry
                  </button>
                </div>
              </div>
              <div style={s.sectionHeader}>
                <div style={s.sectionTitle}>Recent entries</div>
                <div style={s.seeAll} onClick={()=>setActiveNav("entries")}>See all</div>
              </div>
              {!journalsLoaded ? (
                <div style={s.emptyState}><div style={{color:T.muted}}>Loading entries...</div></div>
              ) : journals.length === 0 ? (
                <div style={s.emptyState}>
                  <i className="ti ti-pencil" style={{fontSize:28,color:T.muted,marginBottom:10}}/>
                  <div style={{fontWeight:500,marginBottom:4}}>No entries yet</div>
                  <div style={{fontSize:13,color:T.subtle}}>Write your first entry above to get started</div>
                </div>
              ) : journals.slice(0,3).map(renderJournalCard)}
            </>
          )}

          {activeNav === "entries" && (
            <>
              <div style={s.sectionHeader}>
                <div style={s.sectionTitle}>{journals.length} {journals.length===1?"entry":"entries"}</div>
              </div>
              {journals.length === 0 ? (
                <div style={s.emptyState}>
                  <i className="ti ti-pencil" style={{fontSize:28,color:T.muted,marginBottom:10}}/>
                  <div>No entries yet — go to Dashboard to write one</div>
                </div>
              ) : journals.map(renderJournalCard)}
            </>
          )}

          {activeNav === "insights"  && <InsightsDashboard token={token}/>}
          {activeNav === "pastself"  && <PastSelfChat token={token}/>}

          {activeNav === "settings" && (
            <div style={s.comingSoon}>
              <i className="ti ti-settings" style={{fontSize:36,color:T.muted,marginBottom:14}}/>
              <div style={{fontSize:16,fontWeight:500,marginBottom:6,color:T.primary}}>Settings</div>
              <div style={{fontSize:13,color:T.subtle,maxWidth:280,textAlign:"center"}}>Account and preferences — coming soon.</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
export default function App() {
  const [token, setToken]       = useState(()=>localStorage.getItem("token")||null);
  const [username, setUsername] = useState(()=>localStorage.getItem("username")||"");

  const handleLogin = (tkn, uname) => {
    localStorage.setItem("token", tkn); localStorage.setItem("username", uname);
    setToken(tkn); setUsername(uname);
  };
  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("username");
    setToken(null); setUsername("");
  };

  if (!token) return <AuthPage onLogin={handleLogin}/>;
  return <Dashboard token={token} username={username} onLogout={handleLogout}/>;
}

/* ══════════════════════════════════════════
   AUTH STYLES
══════════════════════════════════════════ */
const auth = {
  page:       { display:"flex", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',Arial,sans-serif" },
  left:       { width:420, background:T.gradient, display:"flex", flexDirection:"column", padding:"36px 40px", flexShrink:0 },
  brand:      { display:"flex", alignItems:"center", gap:10, marginBottom:"auto" },
  leftBody:   { paddingBottom:60 },
  tagline:    { fontSize:34, fontWeight:700, color:"#fff", lineHeight:1.2, letterSpacing:"-0.5px", marginBottom:14 },
  subTagline: { fontSize:15, color:"rgba(255,255,255,0.75)", lineHeight:1.6, marginBottom:32 },
  featureList:{ display:"flex", flexDirection:"column", gap:12 },
  featureItem:{ display:"flex", alignItems:"center", gap:12, fontSize:14, color:"rgba(255,255,255,0.88)" },
  featureDot: { width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.5)", flexShrink:0 },
  right:      { flex:1, background:T.surface, display:"flex", alignItems:"center", justifyContent:"center", padding:40 },
  card:       { width:"100%", maxWidth:400, background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:"28px 28px 24px", display:"flex", flexDirection:"column", gap:16 },
  tabs:       { display:"flex", background:T.surface, borderRadius:10, padding:4, gap:4 },
  tab:        { flex:1, padding:"7px 0", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", background:"transparent", color:T.subtle, fontFamily:"inherit" },
  tabActive:  { background:T.card, color:T.primary, boxShadow:"0 1px 4px rgba(124,92,191,0.14)" },
  cardTitle:  { fontSize:20, fontWeight:700, color:T.text, letterSpacing:"-0.3px" },
  cardSub:    { fontSize:13, color:T.subtle, marginTop:3 },
  errorBox:   { display:"flex", alignItems:"center", gap:8, background:"#FEF2F2", color:"#B91C1C", border:"1px solid #FECACA", borderRadius:8, padding:"9px 12px", fontSize:13 },
  label:      { display:"block", fontSize:12, fontWeight:500, color:T.subtle, marginBottom:5 },
  required:   { color:T.accent, fontWeight:700 },
  optional:   { color:T.muted, fontWeight:400, fontSize:11 },
  input:      { width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${T.border}`, fontSize:14, fontFamily:"inherit", outline:"none", color:T.text, background:T.surface, boxSizing:"border-box" },
  submitBtn:  { width:"100%", padding:12, borderRadius:8, border:"none", background:T.gradient, color:"white", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginTop:4 },
  switchRow:  { fontSize:13, color:T.subtle, textAlign:"center" },
  switchLink: { color:T.primary, fontWeight:500, cursor:"pointer" },
  demoDivider:    { display:"flex", alignItems:"center", gap:10, marginTop:2 },
  demoDividerLine:{ flex:1, height:1, background:T.border },
  demoDividerText:{ fontSize:11, color:T.muted },
  demoBtn:    { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:12, borderRadius:8, border:`1px solid ${T.border}`, background:T.accentSoft, color:T.primary, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
};

/* ══════════════════════════════════════════
   INSIGHT CARD STYLES
══════════════════════════════════════════ */
const ic = {
  card:       { position:"relative", background:T.gradientSoft, border:`1px solid ${T.border}`, borderRadius:14, marginBottom:16, overflow:"hidden" },
  accentBar:  { height:3, background:T.gradient },
  inner:      { display:"flex", gap:14, padding:"14px 16px 12px", alignItems:"flex-start" },
  iconWrap:   { width:38, height:38, borderRadius:10, background:T.card, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 },
  label:      { fontSize:11, fontWeight:600, color:T.primary, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6, display:"flex", alignItems:"center", gap:4 },
  insightText:{ fontSize:14, color:T.text, lineHeight:1.6, fontWeight:450 },
  skeletonWrap:{ paddingTop:2 },
  skeleton:   { height:13, borderRadius:6, background:`linear-gradient(90deg, ${T.border} 25%, ${T.surface} 50%, ${T.border} 75%)`, backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" },
  footer:     { fontSize:11, color:T.muted, marginTop:10 },
};

/* ══════════════════════════════════════════
   INSIGHTS DASHBOARD STYLES
══════════════════════════════════════════ */
const idd = {
  page:         { paddingBottom:40 },
  pageHeader:   { marginBottom:24 },
  pageTitle:    { fontSize:18, fontWeight:700, color:T.text, letterSpacing:"-0.3px", marginBottom:4 },
  pageSubtitle: { fontSize:12, color:T.muted },
  grid:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  card:         { background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 18px", display:"flex", flexDirection:"column", gap:14, minHeight:160 },
  cardTop:      { display:"flex", alignItems:"center", gap:12 },
  iconWrap:     { width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardLabel:    { fontSize:13, fontWeight:600, color:T.text, marginBottom:1 },
  cardHint:     { fontSize:11, color:T.muted },
  tagList:      { display:"flex", flexDirection:"column", gap:7 },
  winTag:       { display:"flex", alignItems:"center", gap:7, fontSize:13, color:"#78350F", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:8, padding:"6px 10px", lineHeight:1.4 },
  topicList:    { display:"flex", flexDirection:"column", gap:9 },
  topicRow:     { display:"flex", alignItems:"center", gap:10 },
  topicBar:     { height:6, borderRadius:4, background:T.gradient, flexShrink:0 },
  topicLabel:   { fontSize:13, color:T.subtle, textTransform:"capitalize", whiteSpace:"nowrap" },
  thoughtText:  { fontSize:14, color:T.primary, lineHeight:1.6, fontStyle:"italic", fontWeight:450 },
  reflectionText:{ fontSize:13, color:"#2d4a3e", lineHeight:1.7 },
  revealBtn:    { display:"flex", alignItems:"center", gap:7, fontSize:13, color:"#16A34A", background:"#F0FDF4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontFamily:"inherit", fontWeight:500, width:"fit-content" },
  unlockMsg:    { display:"flex", alignItems:"center", gap:7, fontSize:12, color:T.muted, fontStyle:"italic" },
  emptyFull:    { display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", color:T.muted, fontSize:14 },
  skeleton:     { borderRadius:6, background:`linear-gradient(90deg,${T.border} 25%,${T.surface} 50%,${T.border} 75%)`, backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" },
};

/* ══════════════════════════════════════════
   DASHBOARD STYLES
══════════════════════════════════════════ */
const s = {
  app:          { display:"flex", minHeight:"100vh", background:T.surface, fontFamily:"'Inter','Segoe UI',Arial,sans-serif", color:T.text },
  sidebar:      { width:210, background:T.card, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", padding:"20px 12px", flexShrink:0, minHeight:"100vh" },
  logo:         { fontSize:16, fontWeight:700, color:T.text, padding:"0 8px", marginBottom:24, display:"flex", alignItems:"center", gap:8, letterSpacing:"-0.3px" },
  newBtn:       { display:"flex", alignItems:"center", gap:8, background:T.gradient, color:"white", border:"none", borderRadius:10, padding:"9px 14px", fontSize:14, fontWeight:500, cursor:"pointer", width:"100%", marginBottom:20, fontFamily:"inherit" },
  navSection:   { fontSize:10, color:T.muted, padding:"0 8px", marginBottom:6, letterSpacing:"0.08em", textTransform:"uppercase" },
  navItem:      { display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, cursor:"pointer", fontSize:14, color:T.subtle, marginBottom:2 },
  navItemActive:{ background:"#F3EEFF", color:T.primary, fontWeight:500 },
  aiBadge:      { fontSize:10, background:"#F3EEFF", color:T.primary, padding:"1px 7px", borderRadius:20, marginLeft:"auto", fontWeight:600 },
  navDivider:   { height:1, background:T.border, margin:"8px 0" },
  sidebarFooter:{ marginTop:"auto", borderTop:`1px solid ${T.border}`, paddingTop:14 },
  userRow:      { display:"flex", alignItems:"center", gap:10, padding:"4px 6px" },
  avatar:       { width:30, height:30, borderRadius:"50%", background:"#F3EEFF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.primary, flexShrink:0 },
  userName:     { fontSize:13, fontWeight:500, color:T.text },
  userSub:      { fontSize:11, color:T.muted },
  logoutBtn:    { background:"none", border:"none", color:T.muted, cursor:"pointer", padding:4, borderRadius:6 },
  main:         { flex:1, display:"flex", flexDirection:"column", minHeight:"100vh" },
  topbar:       { padding:"20px 28px 0", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 },
  pageTitle:    { fontSize:20, fontWeight:700, color:T.text, letterSpacing:"-0.3px" },
  iconBtn:      { width:34, height:34, borderRadius:8, border:`1px solid ${T.border}`, background:T.card, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:T.subtle },
  scroll:       { flex:1, overflowY:"auto", padding:"0 28px 40px" },
  composeBox:   { background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px", marginBottom:16 },
  composeLabel: { fontSize:13, color:T.subtle, marginBottom:10 },
  composeInput: { width:"100%", border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 12px", fontSize:14, fontFamily:"inherit", color:T.text, background:T.surface, resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" },
  composeFooter:{ display:"flex", justifyContent:"flex-end", marginTop:12 },
  saveBtn:      { background:T.gradient, color:"white", border:"none", borderRadius:8, padding:"9px 20px", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit" },
  sectionHeader:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
  sectionTitle: { fontSize:14, fontWeight:600, color:T.text },
  seeAll:       { fontSize:13, color:T.primary, cursor:"pointer" },
  journalCard:  { background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 16px", marginBottom:8 },
  jcTop:        { display:"flex", alignItems:"flex-start", gap:12 },
  jcBody:       { flex:1 },
  jcText:       { fontSize:14, color:T.text, lineHeight:1.55, marginBottom:8, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" },
  jcMeta:       { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  jcDate:       { fontSize:11, color:T.muted, display:"flex", alignItems:"center", gap:4 },
  editBtn:      { background:"none", border:"none", color:T.muted, cursor:"pointer", padding:4, fontSize:15, borderRadius:6, flexShrink:0 },
  delBtn:       { background:"none", border:"none", color:T.muted, cursor:"pointer", padding:4, fontSize:15, borderRadius:6, flexShrink:0 },
  cancelEditBtn:{ background:"none", border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 16px", fontSize:13, color:T.subtle, cursor:"pointer", fontFamily:"inherit" },
  emptyState:   { display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 20px", background:T.card, border:`1px solid ${T.border}`, borderRadius:12, color:T.muted, fontSize:14, textAlign:"center" },
  comingSoon:   { display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", color:T.muted, fontSize:14 },
};

/* ══════════════════════════════════════════
   PAST SELF STYLES
══════════════════════════════════════════ */
const ps = {
  page:         { display:"flex", flexDirection:"column", height:"calc(100vh - 80px)" },
  header:       { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 },
  pageTitle:    { fontSize:18, fontWeight:700, color:T.text, letterSpacing:"-0.3px", marginBottom:3 },
  pageSubtitle: { fontSize:12, color:T.muted },
  backBtn:      { display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:T.primary, fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:"0 0 12px 0", fontWeight:500 },
  importBtn:    { display:"flex", alignItems:"center", gap:6, background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 12px", fontSize:13, color:T.primary, cursor:"pointer", fontFamily:"inherit", fontWeight:500 },
  iconBtn:      { width:34, height:34, background:T.card, border:`1px solid ${T.border}`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:T.subtle },
  importFeedback:{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#16A34A", background:"#F0FDF4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", marginBottom:12 },
  messagesWrap: { flex:1, overflowY:"auto", paddingRight:4, marginBottom:12 },
  starterWrap:  { padding:"20px 0" },
  starterLabel: { fontSize:12, color:T.muted, marginBottom:12, textAlign:"center" },
  starterGrid:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  starterBtn:   { background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:T.primary, cursor:"pointer", fontFamily:"inherit", textAlign:"left", lineHeight:1.4 },
  avatarBubble: { width:28, height:28, borderRadius:"50%", background:"#F3EEFF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  userBubble:   { background:T.gradient, color:"white", borderRadius:"14px 14px 4px 14px", padding:"10px 14px", fontSize:14, lineHeight:1.55, maxWidth:"70%" },
  assistantBubble:{ background:T.card, border:`1px solid ${T.border}`, color:T.text, borderRadius:"14px 14px 14px 4px", padding:"10px 14px", fontSize:14, lineHeight:1.55, maxWidth:"70%" },
  cursor:       { display:"inline-block", animation:"blink 1s infinite" },
  inputRow:     { display:"flex", gap:8, paddingTop:8, borderTop:`1px solid ${T.border}` },
  input:        { flex:1, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"inherit", color:T.text, background:T.surface, outline:"none" },
  sendBtn:      { width:40, height:40, background:T.gradient, border:"none", borderRadius:10, color:"white", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },
  empty:        { fontSize:13, color:T.muted, textAlign:"center", padding:"40px 0" },
  sessionCard:  { display:"flex", alignItems:"center", gap:12, background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", cursor:"pointer" },
  deleteSessionBtn: { background:"none", border:"none", color:T.muted, cursor:"pointer", padding:6, borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },
  sessionTitle: { fontSize:13, fontWeight:500, color:T.text, marginBottom:2 },
  sessionDate:  { fontSize:11, color:T.muted },
};