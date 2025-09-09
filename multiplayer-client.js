(() => {
  const socket = io();
  function createLobbyUI() {
    if (document.getElementById('multiplayer-lobby')) return;
    const c = document.createElement('div');
    c.id = 'multiplayer-lobby';
    c.style = 'position:fixed;right:16px;top:80px;z-index:9999;padding:10px;background:#fff;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.15);max-width:300px;';
    c.innerHTML = `<h3>Multiplayer</h3>
      <button id="host-btn">Host</button>
      <input id="room-input" placeholder="ROOM CODE"/>
      <button id="join-btn">Join</button>
      <div id="room-status"></div>`;
    document.body.appendChild(c);
    document.getElementById('host-btn').onclick = () => {
      socket.emit('create_room', {}, (res) => {
        if(res.ok){ window.__MULTIPLAYER_ROOM=res.roomId; window.__IS_HOST=true; updateRoomStatus('Room: '+res.roomId);}
      });
    };
    document.getElementById('join-btn').onclick = () => {
      const r=document.getElementById('room-input').value.trim().toUpperCase();
      socket.emit('join_room',{roomId:r},(res)=>{
        if(res.ok){ window.__MULTIPLAYER_ROOM=r; window.__IS_HOST=false; updateRoomStatus('Joined '+r);}
      });
    };
  }
  function updateRoomStatus(t){ const el=document.getElementById('room-status'); if(el) el.textContent=t;}
  window.MULTIPLAYER={socket,hostInitState:(s)=>socket.emit('host_init',{roomId:window.__MULTIPLAYER_ROOM,state:s}),sendAction:(a)=>socket.emit('game_action',{roomId:window.__MULTIPLAYER_ROOM,action:a})};
  socket.on('init_state',(d)=>{ if(typeof applyNetworkState==='function') applyNetworkState(d.state);});
  socket.on('game_action',(d)=>{ if(typeof onNetworkAction==='function') onNetworkAction(d.from,d.action);});
  createLobbyUI();
})();