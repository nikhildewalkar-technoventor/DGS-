/* My Digital Journey - V5
   Username-only UI. Internally Supabase Auth uses a generated email alias.
   IMPORTANT: Disable "Confirm email" in Supabase Auth for username-only signup.
*/
const { createClient } = window.supabase;
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_KEY = window.APP_CONFIG?.SUPABASE_PUBLISHABLE_KEY || "";
let sb = null, currentUser = null, currentProfile = null;
const state = { projects:[], activities:[], achievements:[], sports:[], gallery:[] };

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),3200); }
function safeUsername(v){ return v.trim().toLowerCase(); }
function aliasEmail(username){ return `${safeUsername(username)}@student.local`; }
function initials(name="Student"){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function publicImg(url, fallback){ return url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy">` : `<span style="font-size:42px;display:grid;place-items:center;height:100%">${fallback}</span>`; }

function setAuthTab(tab){
  $$(".tab").forEach(b=>b.classList.toggle("active", b.dataset.authTab===tab));
  $("#loginForm").classList.toggle("hidden",tab!=="login");
  $("#signupForm").classList.toggle("hidden",tab!=="signup");
  $("#resetForm").classList.add("hidden");
}
$$("[data-auth-tab]").forEach(b=>b.onclick=()=>setAuthTab(b.dataset.authTab));
$$("[data-toggle-password]").forEach(b=>b.onclick=()=>{const i=$("#"+b.dataset.togglePassword); i.type=i.type==="password"?"text":"password"; b.textContent=i.type==="password"?"Show":"Hide";});
$("#signupPassword").addEventListener("input",e=>{let n=e.target.value.length; $("#strengthBar").style.width=Math.min(100,n*16.6)+"%";});
$("#forgotBtn").onclick=()=>{$("#loginForm").classList.add("hidden");$("#signupForm").classList.add("hidden");$("#resetForm").classList.remove("hidden");};
$("#backLoginBtn").onclick=()=>setAuthTab("login");

async function uploadImage(file, folder){
  if(!file) return null;
  if(!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if(file.size>5*1024*1024) throw new Error("Image must be under 5 MB.");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=`${currentUser.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from("portfolio-images").upload(path,file,{upsert:false,contentType:file.type});
  if(error) throw error;
  return sb.storage.from("portfolio-images").getPublicUrl(path).data.publicUrl;
}
async function removeStorageUrl(url){
  if(!url) return;
  const marker="/storage/v1/object/public/portfolio-images/";
  const i=url.indexOf(marker); if(i<0) return;
  const path=decodeURIComponent(url.slice(i+marker.length));
  await sb.storage.from("portfolio-images").remove([path]);
}

async function ensureProfile(){
  let {data,error}=await sb.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
  if(error) throw error;
  if(!data){
    const meta=currentUser.user_metadata||{};
    const username=(meta.username||currentUser.email.split("@")[0]).toLowerCase();
    const payload={id:currentUser.id,username,full_name:meta.full_name||"Student",roll_no:meta.roll_no||"",class_name:meta.class_name||"",school:meta.school||"",bio:"",interests:"",location:"",avatar_url:null};
    const r=await sb.from("profiles").insert(payload).select().single(); if(r.error) throw r.error; data=r.data;
  }
  currentProfile=data;
}
async function loadAll(){
  const tables=["projects","activities","achievements","sports"];
  for(const table of tables){
    const {data,error}=await sb.from(table).select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false});
    if(error) throw error; state[table]=data||[];
  }
  const {data:g,error:ge}=await sb.from("gallery").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false});
  if(ge) throw ge; state.gallery=g||[];
  renderAll();
}
function renderAll(){
  const p=currentProfile||{};
  $("#userMini").innerHTML=`<div class="avatar" style="width:42px;height:42px;float:left;margin-right:10px">${p.avatar_url?publicImg(p.avatar_url,""):escapeHtml(initials(p.full_name))}</div><strong>${escapeHtml(p.full_name||"Student")}</strong><small style="display:block;color:#a9bdb3;margin-top:4px">@${escapeHtml(p.username||"student")}</small><div style="clear:both"></div>`;
  $("#welcomeTitle").textContent=`Welcome, ${(p.full_name||"Student").split(" ")[0]}!`;
  $("#welcomeText").textContent=p.bio||"Your portfolio is your story — keep building it.";
  $("#overviewAvatar").innerHTML=p.avatar_url?publicImg(p.avatar_url,""):escapeHtml(initials(p.full_name));
  $("#profileAvatar").innerHTML=p.avatar_url?publicImg(p.avatar_url,""):escapeHtml(initials(p.full_name));
  ["projects","activities","achievements","sports"].forEach(t=>$("#count"+t[0].toUpperCase()+t.slice(1)).textContent=state[t].length);
  fillProfile(); renderTable("projects");renderTable("activities");renderTable("achievements");renderTable("sports");renderGallery();
  const recent=state.projects.slice(0,4); $("#recentGrid").innerHTML=recent.length?prepareCards("projects",recent).map(cardHtml).join(""):`<div class="tiny">No projects yet. Start with your first project.</div>`;
}
function fillProfile(){
  $("#profileName").value=currentProfile.full_name||"";$("#profileRoll").value=currentProfile.roll_no||"";
  $("#profileClass").value=currentProfile.class_name||"";$("#profileSchool").value=currentProfile.school||"";
  $("#profileBio").value=currentProfile.bio||"";$("#profileInterests").value=currentProfile.interests||"";$("#profileLocation").value=currentProfile.location||"";
}
function cardHtml(x){
  const img=x.image_url?`<div class="item-img">${publicImg(x.image_url,"✦")}</div>`:`<div class="item-img"><span style="display:grid;place-items:center;height:100%;font-size:42px;color:#1c6b55">✦</span></div>`;
  if(x._type==="projects"){
    const stage=x.stage||"Idea";
    return `<article class="item-card maker-card curriculum-card">${img}<div class="item-body"><span class="item-meta">📚 ${escapeHtml(x.category||"Curriculum")}</span><div class="stage-pill">${stageIcon(stage)} ${escapeHtml(stage)}</div><h3>${escapeHtml(x.title)}</h3>${x.objective?`<p><strong>Objective:</strong> ${escapeHtml(x.objective)}</p>`:""}${x.materials?`<p><strong>Materials:</strong> ${escapeHtml(x.materials)}</p>`:""}${x.what_did?`<p><strong>What I did:</strong> ${escapeHtml(x.what_did)}</p>`:""}${x.description?`<p>${escapeHtml(x.description)}</p>`:""}${x.skills?`<p class="skills-line"><strong>Skills:</strong> ${escapeHtml(x.skills)}</p>`:""}${x.outcome?`<p class="outcome-line"><strong>Learning:</strong> ${escapeHtml(x.outcome)}</p>`:""}</div><div class="item-actions"><button data-edit="${x.id}">Edit</button><button data-delete="${x.id}">Delete</button></div></article>`;
  }
  if(x._type==="activities"){
    return `<article class="item-card beyond-card">${img}<div class="item-body"><span class="item-meta">🌟 ${escapeHtml(x.category||"Beyond Curriculum")}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description||"")}</p>${x.year?`<span class="year-badge">${escapeHtml(x.year)}</span>`:""}</div><div class="item-actions"><button data-edit="${x.id}">Edit</button><button data-delete="${x.id}">Delete</button></div></article>`;
  }
  return `<article class="item-card">${img}<div class="item-body"><span class="item-meta">${escapeHtml(x.category||x.year||"Portfolio")}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description||"")}</p></div><div class="item-actions"><button data-edit="${x.id}">Edit</button><button data-delete="${x.id}">Delete</button></div></article>`;
}
function stageIcon(stage){ return ({Idea:"💡",Design:"✏️",Build:"🔧",Test:"🧪",Improve:"🔁",Showcase:"🏆"}[stage]||"💡"); }
function prepareCards(type,items){ return items.map(x=>({...x,_type:type})); }
function renderTable(type){
  const items=type==="projects"?prepareCards(type,state[type]):state[type];
  $("#"+type+"Grid").innerHTML=state[type].length?items.map(cardHtml).join(""):`<div class="tiny">Nothing here yet. Add your first ${type.slice(0,-1)}.</div>`;
  $("#"+type+"Grid").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openItem(type,b.dataset.edit));
  $("#"+type+"Grid").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteItem(type,b.dataset.delete));
}
function renderGallery(){
  $("#galleryGrid").innerHTML=state.gallery.length?state.gallery.map(g=>`<div class="gallery-tile"><img src="${escapeHtml(g.image_url)}" loading="lazy"><button class="gallery-delete" data-gallery-delete="${g.id}">×</button></div>`).join(""):`<div class="tiny">Your gallery is empty.</div>`;
  $$("[data-gallery-delete]").forEach(b=>b.onclick=()=>deleteGallery(b.dataset.galleryDelete));
}
function nav(page){
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  const titles={overview:"Overview",profile:"My Profile",projects:"Makerspace",activities:"Beyond Curriculum",achievements:"Achievements",sports:"Sports",gallery:"Gallery"};
  $("#pageTitle").textContent=titles[page]||"Overview";
  $("#pageEyebrow").textContent=page==="overview"?"MY DIGITAL JOURNEY":page.toUpperCase();
}
$$(".nav-item").forEach(b=>b.onclick=()=>nav(b.dataset.page));
$$("[data-page-jump]").forEach(b=>b.onclick=()=>nav(b.dataset.pageJump));
$$("[data-maker-tab]").forEach(b=>b.onclick=()=>{
  const tab=b.dataset.makerTab;
  $$(".maker-tab").forEach(x=>x.classList.toggle("active",x.dataset.makerTab===tab));
  $$(".maker-track").forEach(x=>x.classList.toggle("active",x.id===(tab==="curriculum"?"curriculumTrack":"beyondTrack")));
});

function openItem(type,id=null){
  $("#itemType").value=type; $("#itemId").value=id||"";
  const existing=id?state[type].find(x=>x.id===id):null;
  const maker=type==="projects";
  $("#modalTitle").textContent=existing?(maker?"Edit Makerspace project":"Edit item"):(maker?"New Makerspace project":`Add ${type.slice(0,-1)}`);
  $("#modalEyebrow").textContent=maker?"MAKERSPACE":type.toUpperCase();
  $("#itemTitle").value=existing?.title||"";$("#itemCategory").value=existing?.category||"";
  $("#itemPhoto").value="";
  $("#makerspaceFields").classList.toggle("hidden",!maker);
  $("#normalDescriptionLabel").classList.toggle("hidden",maker);
  $("#normalDateLabel").classList.toggle("hidden",maker);
  $("#categoryLabel").classList.toggle("hidden",false);
  if(maker){
    $("#itemSubject").value=existing?.subject||existing?.category||"";$("#itemStage").value=existing?.stage||"Idea";$("#itemObjective").value=existing?.objective||"";$("#itemMaterials").value=existing?.materials||"";$("#itemWhatDid").value=existing?.what_did||"";$("#itemSkills").value=existing?.skills||"";$("#itemOutcome").value=existing?.outcome||"";$("#itemDate").value=existing?.year||"";
  }else{
    $("#itemDescription").value=existing?.description||"";$("#itemDateNormal").value=existing?.year||"";
  }
  $("#itemDialog").showModal();
}
$$("[data-add]").forEach(b=>b.onclick=()=>openItem(b.dataset.add));
$("#modalClose").onclick=$("#modalCancel").onclick=()=>$("#itemDialog").close();
$("#itemForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const type=$("#itemType").value,id=$("#itemId").value,title=$("#itemTitle").value.trim();
    const maker=type==="projects";
    let row={user_id:currentUser.id,title,category:$("#itemCategory").value.trim()};
    if(maker){
      row.category=$("#itemSubject").value.trim();row.subject=$("#itemSubject").value.trim();row.stage=$("#itemStage").value;row.objective=$("#itemObjective").value.trim();row.materials=$("#itemMaterials").value.trim();row.what_did=$("#itemWhatDid").value.trim();row.skills=$("#itemSkills").value.trim();row.outcome=$("#itemOutcome").value.trim();row.description=row.what_did||row.outcome||row.objective;row.year=$("#itemDate").value.trim();
    }else{
      row.description=$("#itemDescription").value.trim();row.year=$("#itemDateNormal").value.trim();
    }
    const existing=id?state[type].find(x=>x.id===id):null;
    const file=$("#itemPhoto").files[0];
    if(file) row.image_url=await uploadImage(file,type);
    if(id){
      if(!row.image_url) delete row.image_url;
      const {error}=await sb.from(type).update(row).eq("id",id).eq("user_id",currentUser.id);if(error)throw error;
    }else{const {error}=await sb.from(type).insert(row);if(error)throw error;}
    $("#itemDialog").close();await loadAll();toast("Saved successfully.");
  }catch(err){toast(err.message||"Could not save.");}
};
async function deleteItem(type,id){
  if(!confirm("Delete this item?"))return;
  const old=state[type].find(x=>x.id===id);
  try{await removeStorageUrl(old?.image_url);const {error}=await sb.from(type).delete().eq("id",id).eq("user_id",currentUser.id);if(error)throw error;await loadAll();toast("Deleted.");}catch(e){toast(e.message);}
}

$("#profileForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const {data,error}=await sb.from("profiles").update({full_name:$("#profileName").value.trim(),roll_no:$("#profileRoll").value.trim(),class_name:$("#profileClass").value.trim(),school:$("#profileSchool").value.trim(),bio:$("#profileBio").value.trim(),interests:$("#profileInterests").value.trim(),location:$("#profileLocation").value.trim()}).eq("id",currentUser.id).select().single();
    if(error)throw error;currentProfile=data;renderAll();toast("Profile updated.");
  }catch(e){toast(e.message);}
};
$("#photoBtn").onclick=()=>$("#profilePhoto").click();
$("#profilePhoto").onchange=async e=>{try{const url=await uploadImage(e.target.files[0],"profile");const {error}=await sb.from("profiles").update({avatar_url:url}).eq("id",currentUser.id);if(error)throw error;currentProfile.avatar_url=url;renderAll();toast("Profile photo updated.");}catch(err){toast(err.message);}};
$("#galleryAddBtn").onclick=()=>$("#galleryInput").click();
$("#galleryInput").onchange=async e=>{
  try{for(const file of [...e.target.files]){const url=await uploadImage(file,"gallery");const {error}=await sb.from("gallery").insert({user_id:currentUser.id,image_url:url});if(error)throw error;}await loadAll();toast("Photos added.");e.target.value="";}catch(err){toast(err.message);}
};
async function deleteGallery(id){if(!confirm("Remove this photo?"))return;const g=state.gallery.find(x=>x.id===id);try{await removeStorageUrl(g?.image_url);const {error}=await sb.from("gallery").delete().eq("id",id).eq("user_id",currentUser.id);if(error)throw error;await loadAll();}catch(e){toast(e.message);}}

$("#signupForm").onsubmit=async e=>{
  e.preventDefault();
  if(!sb){toast("Supabase is not connected.");return;}
  const username=safeUsername($("#signupUsername").value);
  const pass=$("#signupPassword").value, confirmPass=$("#signupConfirm").value;
  if(pass!==confirmPass){toast("Passwords do not match.");return;}
  if(!/^[a-z0-9._-]{4,24}$/.test(username)){toast("Username: 4–24 characters, letters/numbers/._- only.");return;}
  try{
    const {data,error}=await sb.auth.signUp({email:aliasEmail(username),password:pass,options:{data:{username,full_name:$("#signupName").value.trim(),roll_no:$("#signupRoll").value.trim(),class_name:$("#signupClass").value.trim(),school:$("#signupSchool").value.trim()}}});
    if(error)throw error;
    if(!data.session){toast("Account created. Ask admin to disable Confirm Email if signup is waiting for email confirmation.");}
    else toast("Account created!");
    if(data.session) await bootUser(data.user);
  }catch(err){toast(err.message||"Signup failed.");}
};
$("#loginForm").onsubmit=async e=>{
  e.preventDefault();try{const username=safeUsername($("#loginUsername").value);const {data,error}=await sb.auth.signInWithPassword({email:aliasEmail(username),password:$("#loginPassword").value});if(error)throw error;await bootUser(data.user);}catch(err){toast("Login failed: "+(err.message||"Check username/password."));}
};
$("#resetForm").onsubmit=async e=>{e.preventDefault();toast("Username-only password reset requires a verified recovery contact. Ask your school/admin to reset the password from Supabase.");};

async function bootUser(user){
  currentUser=user;await ensureProfile();await loadAll();
  $("#authScreen").classList.add("hidden");$("#appShell").classList.remove("hidden");$("#connectionDot").textContent="● Connected";$("#connectionDot").style.color="#1c6b55";nav("overview");
}
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();currentUser=null;$("#appShell").classList.add("hidden");$("#authScreen").classList.remove("hidden");setAuthTab("login");};

async function init(){
  if(!SUPABASE_URL||!SUPABASE_KEY){toast("Connect Supabase in Netlify environment variables first.");return;}
  sb=createClient(SUPABASE_URL,SUPABASE_KEY);
  const {data:{session}}=await sb.auth.getSession();
  if(session) await bootUser(session.user);
}
init();
