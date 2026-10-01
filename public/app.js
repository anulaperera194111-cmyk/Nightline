
async function api(url,opts={}){const r=await fetch(url,opts);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
const $=id=>document.getElementById(id);let me=null,currentRoom=null,refresh=null;
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function note(t){const n=$("notice");if(n){n.textContent=t;setTimeout(()=>{if(n.textContent===t)n.textContent=""},5000)}}
function modal(content){$("modalCard").innerHTML=content;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
$("modal")?.addEventListener("click",e=>{if(e.target.classList.contains("modal-bg"))closeModal()});

async function boot(){
  const d=await api("/api/me");me=d;
  if(location.pathname==="/"&&d.authenticated){location.href="/cm";return}
  if(location.pathname==="/cm"&&!d.authenticated){location.href="/";return}
  if(location.pathname==="/"){initLanding();return}
  initApp();
}
function initLanding(){
  $("signinForm").addEventListener("submit",async e=>{
    e.preventDefault();
    try{await api("/api/signin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("username").value.trim(),dob:$("dob").value})});location.href="/cm"}catch(e){note(e.message)}
  });
}
async function initApp(){
  $("who").textContent=me.username;
  $("logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.href="/"};
  $("newRoom").onclick=showCreate;$("emptyCreate").onclick=showCreate;$("emptyJoin").onclick=showJoin;
  $("closeRoom").onclick=()=>selectRoom(null);$("roomInfo").onclick=showInfo;
  $("messageForm").addEventListener("submit",send);
  $("message").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("messageForm").requestSubmit()}});
  await loadRooms();
  refresh=setInterval(async()=>{await loadRooms();if(currentRoom)await loadMessages(false)},15000);
}
function showCreate(){
  modal(`<h2>Create a private room</h2><p class="sub">Your room will stay active for 48 hours.</p>
  <label>Room name<input id="mName" maxlength="80" placeholder="Friday night"></label>
  <label>Password<input id="mPw" type="password" minlength="4" placeholder="At least 4 characters"></label>
  <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancel</button><button class="primary" id="mCreate">Create room</button></div>`);
  $("mCreate").onclick=async()=>{try{const d=await api("/api/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:$("mName").value.trim(),password:$("mPw").value})});closeModal();await loadRooms();selectRoom(d.room.id)}catch(e){note(e.message);closeModal()}};
}
function showJoin(){
  modal(`<h2>Unlock a room</h2><p class="sub">Enter the exact room name and its password.</p>
  <label>Room name<input id="jName" maxlength="80" placeholder="Room name"></label>
  <label>Password<input id="jPw" type="password" placeholder="Room password"></label>
  <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancel</button><button class="primary" id="jGo">Unlock room</button></div>`);
  $("jGo").onclick=async()=>{try{const d=await api("/api/rooms/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:$("jName").value.trim(),password:$("jPw").value})});closeModal();await loadRooms();selectRoom(d.room.id)}catch(e){note(e.message)}};
}
async function loadRooms(){
  try{
    const d=await api("/api/rooms");const box=$("rooms");box.innerHTML="";
    if(!d.rooms.length){box.innerHTML='<div class="tiny" style="padding:22px 10px">No rooms yet.<br>Create one to get started.</div>'}
    d.rooms.forEach(r=>{
      const el=document.createElement("div");el.className="room"+(currentRoom===Number(r.id)?" active":"");
      const owner=Number(r.owner_id)===Number(me.userId)?'<span class="owner-tag">YOU</span>':"";
      el.innerHTML=`<div class="room-name">${esc(r.name)} ${owner}</div><div class="room-meta">ID ${r.id} · expires ${timeLeft(r.expires_at)}</div>`;
      el.onclick=()=>selectRoom(Number(r.id));
      if(Number(r.owner_id)===Number(me.userId)){const b=document.createElement("button");b.className="room-delete";b.textContent="×";b.title="Delete room";b.onclick=async e=>{e.stopPropagation();if(confirm("Delete this room permanently?")){try{await api("/api/rooms/"+r.id,{method:"DELETE"});if(currentRoom===Number(r.id))selectRoom(null);await loadRooms()}catch(e){note(e.message)}}};el.appendChild(b)}
      box.appendChild(el);
    });
  }catch(e){note(e.message)}
}
function timeLeft(x){const ms=new Date(x)-Date.now();if(ms<=0)return"expired";const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h?`${h}h ${m}m`:`${m}m`}
async function selectRoom(id){currentRoom=id;document.querySelectorAll(".room").forEach(x=>x.classList.remove("active"));if(!id){$("emptyState").classList.remove("hidden");$("chatView").classList.add("hidden");return}$("emptyState").classList.add("hidden");$("chatView").classList.remove("hidden");await loadMessages(true);await loadRooms()}
async function loadMessages(scroll=true){
  if(!currentRoom)return;
  try{
    const d=await api(`/api/rooms/${currentRoom}/messages`);$("roomTitle").textContent=d.room.name;
    $("roomMeta").textContent=`Room ${d.room.id} · expires in ${timeLeft(d.room.expires_at)}`;
    const box=$("messages"),atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
    box.innerHTML="";
    d.messages.forEach(m=>{
      const mine=Number(m.user_id)===Number(me.userId), initial=esc((m.username||"?")[0].toUpperCase());
      const x=document.createElement("div");x.className="message"+(mine?" mine":"");
      let body=esc(m.body||"").replace(/\n/g,"<br>");
      if(m.attachment_name)body+=`<a class="attachment" href="/api/files/${m.id}" target="_blank" rel="noopener">↗ ${esc(m.attachment_name)}</a>`;
      x.innerHTML=`<div class="avatar">${initial}</div><div class="bubble"><div class="meta">${esc(m.username)} · ${new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><div class="body">${body}</div></div>`;
      box.appendChild(x);
    });
    if(scroll||atBottom)box.scrollTop=box.scrollHeight;
  }catch(e){note(e.message)}
}
async function send(e){
  e.preventDefault();if(!currentRoom)return;
  const text=$("message").value.trim(),file=$("file").files[0];if(!text&&!file)return;
  const m=text.match(/^@(groq|mistral|openrouter|openr)\s+([\s\S]+)/i);
  try{
    if(m&&!file){
      const provider=m[1].toLowerCase()==="openr"?"openrouter":m[1].toLowerCase();
      $("message").value="";await api("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider,prompt:m[2],roomId:currentRoom})});
    }else{
      const fd=new FormData();fd.append("body",text);if(file)fd.append("file",file);
      $("message").value="";$("file").value="";await api(`/api/rooms/${currentRoom}/messages`,{method:"POST",body:fd});
    }
    await loadMessages(true);
  }catch(e){note(e.message)}
}
function showJoinFromInfo(){}
function showInfo(){
  if(!currentRoom)return;
  const title=$("roomTitle").textContent,meta=$("roomMeta").textContent;
  modal(`<h2>${esc(title)}</h2><p class="sub">${esc(meta)}</p><p class="tiny">Share the room name and password only with people you want to invite. The room and its files are removed when the 48-hour lifetime ends.</p><div class="modal-actions"><button class="primary" onclick="closeModal()">Done</button></div>`);
}
boot().catch(e=>{console.error(e);note(e.message)});
