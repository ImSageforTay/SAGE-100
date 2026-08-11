(() => {
"use strict";
const { createClient } = window.supabase;
const cfg = window.SAGE_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY &&
  !cfg.SUPABASE_URL.includes("PASTE_") && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
const supabase = configured ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY) : null;
const TOTAL_DAYS = 100;

const quests = [
["Reset","15-Minute Reset","Clean or organize one small area for 15 minutes.",10,2],
["School","Lock-In","Do 30 minutes of focused schoolwork with distractions away.",15,3],
["Creator","Creator Mode","Create one gaming clip, Short, thumbnail, idea, or recording.",20,3],
["Discipline","No-Snooze Mission","Get up when your alarm goes off and start your first task.",10,2],
["Learning","Skill Tree","Spend 25 minutes learning a useful skill.",15,3],
["Life","Future Sage","Write down three things you want your future self to accomplish.",10,1],
["Creator","Idea Forge","Write five gaming content ideas and pick your favorite.",15,2],
["School","Boss Battle","Work for 45 minutes on the school topic you find hardest.",20,4],
["Life","Digital Cleanup","Delete or organize 20 unnecessary files, screenshots, or downloads.",10,2],
["Discipline","Finish One Thing","Choose one small unfinished task and finish it completely.",15,3]
];
const sideQuests = [
"Write one sentence about what went well today.","Organize tomorrow's tasks.","Read for 10 minutes.",
"Improve one old piece of content for 10 minutes.","Put five things back where they belong.",
"Take a short screen break and reset.","Write one thing you want to learn this week."
];
const $ = id => document.getElementById(id);
let profile = null;

function toast(text,bad=false){const e=$("toast");e.textContent=text;e.className=`toast show ${bad?"bad":""}`;setTimeout(()=>e.className="toast",3000);}
function authMsg(text,bad=false){$("authMessage").textContent=text;$("authMessage").className=`message ${bad?"bad":""}`;}
function localDateString(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
function dateFromString(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function currentDay(start){const a=dateFromString(start),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.max(1,Math.min(100,Math.floor((t-a)/86400000)+1));}
function levelFromXp(xp){let level=1,remaining=Math.max(0,xp);while(remaining>=level*100){remaining-=level*100;level++;if(level>1000)break;}return{level,into:remaining,needed:level*100};}
function doneSet(){return new Set(profile?.completed_days||[]);}
function streak(){const s=new Set(profile?.completed_dates||[]);let c=0,d=new Date();while(s.has(localDateString(d))){c++;d.setDate(d.getDate()-1);}return c;}
function showApp(){$("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");}
function showAuth(){$("authView").classList.remove("hidden");$("appView").classList.add("hidden");$("logoutBtn").classList.add("hidden");}

function render(){
 if(!profile)return;
 const day=currentDay(profile.start_date),q=quests[(day-1)%quests.length],lvl=levelFromXp(profile.xp),done=doneSet().has(day),sideDone=(profile.side_dates||[]).includes(localDateString());
 $("usernameLabel").textContent=profile.username;$("profileUsername").value=profile.username;
 $("levelLabel").textContent=`Level ${lvl.level}`;$("xpLabel").textContent=`${profile.xp} XP`;$("xpBar").style.width=`${Math.round(lvl.into/lvl.needed*100)}%`;$("nextLevelLabel").textContent=`${lvl.needed-lvl.into} XP to next level`;
 $("dayNumber").textContent=day;$("streakLabel").textContent=streak();$("completedLabel").textContent=(profile.completed_days||[]).length;
 $("categoryLabel").textContent=q[0];$("questTitle").textContent=q[1];$("questDescription").textContent=q[2];$("xpReward").textContent=`+${q[3]} XP`;$("difficultyBadge").textContent="⭐".repeat(q[4]);
 $("questStatus").textContent=done?"✅ Completed":"Not completed";$("completeBtn").disabled=done||(profile.completed_days||[]).length>=100;$("completeBtn").textContent=done?"Quest Completed ✓":"Complete Quest";
 $("sideQuestText").textContent=sideQuests[(day-1)%sideQuests.length];$("sideCompleteBtn").disabled=sideDone;$("sideCompleteBtn").textContent=sideDone?"Side Quest Completed ✓":"Complete Side Quest";
 $("mapSummary").textContent=`${Math.round((profile.completed_days||[]).length/100*100)}%`;renderGrid();
}
function renderGrid(){const g=$("dayGrid"),today=currentDay(profile.start_date),done=doneSet();g.innerHTML="";for(let i=1;i<=100;i++){const e=document.createElement("div");e.className="day";if(done.has(i))e.classList.add("done");if(i===today)e.classList.add("today");e.textContent=i;g.appendChild(e);}}

async function loadProfile(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){profile=null;showAuth();return;}
 const {data,error}=await supabase.from("profiles").select("user_id,username,start_date,xp,completed_days,completed_dates,side_dates").eq("user_id",user.id).single();
 if(error){toast("Couldn't load profile: "+error.message,true);return;}
 profile=data;showApp();render();loadLeaderboard();
}
async function signUp(){
 if(!supabase)return authMsg("Finish the Supabase setup first.",true);
 const username=$("signupUsername").value.trim(),email=$("signupEmail").value.trim(),password=$("signupPassword").value;
 if(!/^[A-Za-z0-9_]{3,20}$/.test(username))return authMsg("Username must be 3–20 characters: letters, numbers or _.",true);
 if(password.length<8)return authMsg("Password must be at least 8 characters.",true);
 $("signupBtn").disabled=true;
 const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username}}});
 $("signupBtn").disabled=false;
 if(error)return authMsg(error.message,true);
 if(data.session){toast("Account created!");await loadProfile();}else authMsg("Account created. Check your email to confirm it, then log in.");
}
async function login(){
 if(!supabase)return authMsg("Finish the Supabase setup first.",true);
 $("loginBtn").disabled=true;const {error}=await supabase.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});$("loginBtn").disabled=false;
 if(error)return authMsg(error.message,true);authMsg("");await loadProfile();
}
async function completeMain(){
 $("completeBtn").disabled=true;const {data,error}=await supabase.rpc("complete_today");
 if(error){toast(error.message,true);$("completeBtn").disabled=false;return;}
 if(!data?.ok){toast(data?.message||"Quest could not be completed.",true);$("completeBtn").disabled=false;return;}
 const old=levelFromXp(profile.xp).level;profile=data.profile;render();toast(data.level>old?`🔥 LEVEL ${data.level}!`:`Quest complete! +${data.xp_awarded} XP`);loadLeaderboard();
}
async function completeSide(){
 $("sideCompleteBtn").disabled=true;const {data,error}=await supabase.rpc("complete_side_today");
 if(error){toast(error.message,true);$("sideCompleteBtn").disabled=false;return;}
 if(!data?.ok){toast(data?.message||"Side quest could not be completed.",true);$("sideCompleteBtn").disabled=false;return;}
 profile=data.profile;render();toast("Side quest complete! +5 XP");loadLeaderboard();
}
async function loadLeaderboard(){
 const {data,error}=await supabase.from("profiles").select("username,xp,completed_days").order("xp",{ascending:false}).order("username",{ascending:true}).limit(20);
 const b=$("leaderboard");if(error){b.innerHTML='<div class="leader-row">Leaderboard unavailable.</div>';return;}
 b.innerHTML=data.map((p,i)=>`<div class="leader-row"><span class="rank">${i+1}</span><span class="leader-name">${escapeHtml(p.username)}</span><span>${p.xp} XP</span><span class="muted">${(p.completed_days||[]).length}/100</span></div>`).join("")||'<div class="leader-row">No players yet.</div>';
}
async function saveProfile(){
 const username=$("profileUsername").value.trim();if(!/^[A-Za-z0-9_]{3,20}$/.test(username))return toast("Username must be 3–20 characters: letters, numbers or _.",true);
 const {data,error}=await supabase.from("profiles").update({username}).eq("user_id",profile.user_id).select("user_id,username,start_date,xp,completed_days,completed_dates,side_dates").single();
 if(error)return toast(error.message,true);profile=data;render();loadLeaderboard();toast("Profile saved.");
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

$("loginTab").onclick=()=>{$("loginTab").classList.add("active");$("signupTab").classList.remove("active");$("loginForm").classList.remove("hidden");$("signupForm").classList.add("hidden");};
$("signupTab").onclick=()=>{$("signupTab").classList.add("active");$("loginTab").classList.remove("active");$("signupForm").classList.remove("hidden");$("loginForm").classList.add("hidden");};
$("loginBtn").onclick=login;$("signupBtn").onclick=signUp;$("completeBtn").onclick=completeMain;$("sideCompleteBtn").onclick=completeSide;$("saveProfileBtn").onclick=saveProfile;$("refreshLeaderboardBtn").onclick=loadLeaderboard;
$("logoutBtn").onclick=async()=>{await supabase.auth.signOut();profile=null;showAuth();toast("Logged out.");};

if(!configured)authMsg("V2 is installed, but it needs your Supabase URL and Publishable key in config.js.",true);
else{supabase.auth.onAuthStateChange(()=>loadProfile());loadProfile();}
})();
