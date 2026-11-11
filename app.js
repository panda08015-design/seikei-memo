(() => {
'use strict';
const OLD_KEY='seikei-memo-v1', KEY='seikei-memo-v2';
const CHARACTERS=[
 {id:'kirsche',name:'キルシ',color:'#b64c80',light:'#ffe6f0',symbol:'♥',sub:'気軽に書いてね♪'},
 {id:'aisha',name:'アイシャ',color:'#5257a1',light:'#e8e9ff',symbol:'★',sub:'忘れないように、ここに残すわ。'},
 {id:'ilza',name:'イルザ',color:'#c63d4d',light:'#ffe7e8',symbol:'羽',sub:'なんでも書いていいじゃん！'},
 {id:'maori',name:'マオリ',color:'#35835c',light:'#e3f6e9',symbol:'✿',sub:'大切に記録しますね。'}
];
const $=id=>document.getElementById(id);
const empty=()=>({scratch:'',notes:[]});
const blank=()=>({version:2,characters:Object.fromEntries(CHARACTERS.map(c=>[c.id,empty()]))});
function validNotes(notes){return Array.isArray(notes)&&notes.every(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.body==='string'&&(n.pinned===undefined||typeof n.pinned==='boolean'));}
function cleanNotes(notes){return notes.map(n=>({id:n.id,title:n.title,body:n.body,pinned:!!n.pinned}));}
function validateV2(v){return v&&v.version===2&&v.characters&&CHARACTERS.every(c=>v.characters[c.id]&&typeof v.characters[c.id].scratch==='string'&&validNotes(v.characters[c.id].notes));}
function fromV1(v){if(!v||typeof v.scratch!=='string'||!validNotes(v.notes))throw Error('旧バックアップの形式が違います');const result=blank();result.characters.kirsche.scratch=v.scratch;result.characters.aisha.notes=cleanNotes(v.notes);return result;}
let state=blank(), loadError=false, selected='kirsche', editId=null, timer,toastTimer;
try{
 const v2=MemoStorage.read(KEY);
 if(v2!==null){const parsed=JSON.parse(v2);if(!validateV2(parsed))throw Error('Ver.0.8保存形式が不正です');state=parsed;}
 else {const old=MemoStorage.read(OLD_KEY);if(old!==null){state=fromV1(JSON.parse(old));MemoStorage.write(KEY,JSON.stringify(state));}}
}catch(err){console.error('Memo load/migration failed',err);loadError=true;}
const current=()=>state.characters[selected];
function notify(msg){const el=$('toast');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2300);}
function save(){if(loadError){notify('読み込みエラー：保存を停止しました');return false;}try{MemoStorage.write(KEY,JSON.stringify(state));$('status').textContent='保存済み';return true;}catch(err){console.error('Save failed',err);$('status').textContent='保存できませんでした';notify('保存できません。バックアップを確認してください');return false;}}
function flush(){clearTimeout(timer);current().scratch=$('scratch').value;return save();}
function renderHome(){
 const root=$('home-grid');root.replaceChildren();
 for(const c of CHARACTERS){
  const b=document.createElement('button');b.type='button';b.className='home-card';
  b.style.setProperty('--card-color',c.color);b.style.setProperty('--card-light',c.light);
  const img=document.createElement('img');img.src=c.id+'-select.png';img.alt=c.name+'のキャラクター選択画像';
  const info=document.createElement('span');info.className='home-card-info';
  const name=document.createElement('span');name.className='home-card-name';name.textContent=c.name;
  const count=document.createElement('span');count.className='home-card-count';count.textContent='大切なメモ '+state.characters[c.id].notes.length+'件';
  info.append(name,count);b.append(img,info);b.onclick=()=>{setCharacter(c.id);showMemo();};root.append(b);
 }
}
function showHome(){if(!$('editor').hidden)closeEditor();if(!flush())return;$('memo-screen').hidden=true;$('home-screen').hidden=false;renderHome();window.scrollTo(0,0);}
function showMemo(){$('home-screen').hidden=true;$('memo-screen').hidden=false;window.scrollTo(0,0);}
$('home-back').onclick=showHome;
$('home-import').onclick=()=>$('import').click();
function setCharacter(id){if(!CHARACTERS.some(c=>c.id===id))return;if(selected!==id&&!flush())return;selected=id;const c=CHARACTERS.find(x=>x.id===id);document.documentElement.style.setProperty('--char',c.color);document.documentElement.style.setProperty('--char-light',c.light);$('quick-name').textContent=c.name+'の一時メモ';$('saved-name').textContent=c.name+'の大切なメモ';$('quick-sub').textContent=c.sub;$('saved-sub').textContent=c.sub;document.querySelectorAll('.character .avatar').forEach(e=>e.textContent=c.symbol);$('scratch').value=current().scratch;$('status').textContent='自動保存';$('search').value='';$('newtitle').value='';document.querySelectorAll('#character-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.id===id)));render();}
for(const c of CHARACTERS){const b=document.createElement('button');b.type='button';b.dataset.id=c.id;b.textContent=c.name;b.setAttribute('aria-selected','false');b.onclick=()=>setCharacter(c.id);if($('character-tabs'))$('character-tabs').append(b);}
$('scratch').addEventListener('input',e=>{current().scratch=e.target.value;$('status').textContent='入力中…';clearTimeout(timer);timer=setTimeout(save,250);});
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
function addNote(title,body){current().notes.unshift({id:(globalThis.crypto&&typeof crypto.randomUUID==='function')?crypto.randomUUID():String(Date.now()+Math.random()),title,body,pinned:false});const ok=save();render();if(ok)notify('大切なメモに保存しました');return ok;}
$('promote').onclick=()=>{const body=$('scratch').value.trim();if(!body)return alert('一時メモに文字を入力してください。');const title=prompt('大切なメモのタイトル',body.split('\n')[0].slice(0,30));if(title===null)return;if(addNote(title.trim()||'無題のメモ',body)){$('scratch').value='';current().scratch='';save();}};
$('clear').onclick=()=>{if(!$('scratch').value||confirm('一時メモを消去しますか？')){$('scratch').value='';current().scratch='';save();}};
$('add').onclick=()=>{const t=$('newtitle').value.trim();if(!t)return $('newtitle').focus();if(addNote(t,''))$('newtitle').value='';};
$('newtitle').addEventListener('keydown',e=>{if(e.key==='Enter')$('add').click();});
function openEditor(id){const n=current().notes.find(item=>item.id===id);if(!n)return;editId=id;$('edittitle').value=n.title;$('editbody').value=n.body;$('edit-error').textContent='';$('editor').hidden=false;document.body.classList.add('editor-open');$('edittitle').focus();}
function closeEditor(){$('editor').hidden=true;document.body.classList.remove('editor-open');editId=null;}
$('cancel-edit').onclick=closeEditor;
$('save-edit').onclick=()=>{const n=current().notes.find(item=>item.id===editId);if(!n){$('edit-error').textContent='編集対象が見つかりません。';return;}n.title=$('edittitle').value.trim()||'無題のメモ';n.body=$('editbody').value;if(save()){render();closeEditor();notify('変更を保存しました');}else $('edit-error').textContent='保存できませんでした。';};
$('editor').addEventListener('click',e=>{if(e.target===$('editor'))closeEditor();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('editor').hidden)closeEditor();});
function render(){const root=$('notes');root.replaceChildren();$('count').textContent=current().notes.length+'件';const q=$('search').value.trim().toLocaleLowerCase();const filtered=current().notes.filter(n=>(n.title+'\n'+n.body).toLocaleLowerCase().includes(q));$('search-count').textContent=q?'検索結果：'+filtered.length+'件':'';if(!filtered.length){const el=document.createElement('div');el.className='empty';el.textContent=q?'一致するメモはありません。':'まだメモがありません。下の＋追加から作れます。';root.append(el);}for(const n of [...filtered].sort((a,b)=>Number(b.pinned)-Number(a.pinned))){const box=document.createElement('article');box.className='note';const head=document.createElement('div');head.className='note-head';const title=document.createElement('span');title.className='note-title';title.textContent=(n.pinned?'📌 ':'')+n.title;const actions=document.createElement('div');actions.className='note-actions';const pin=document.createElement('button');pin.textContent=n.pinned?'解除':'固定';pin.setAttribute('aria-label',n.title+'を'+(n.pinned?'固定解除':'固定'));pin.onclick=()=>{n.pinned=!n.pinned;if(save())notify(n.pinned?'先頭に固定しました':'固定を解除しました');render();};const edit=document.createElement('button');edit.textContent='編集';edit.onclick=()=>openEditor(n.id);const del=document.createElement('button');del.textContent='削除';del.onclick=()=>{if(confirm('「'+n.title+'」を削除しますか？')){current().notes=current().notes.filter(x=>x.id!==n.id);if(save())notify('メモを削除しました');render();}};actions.append(pin,edit,del);head.append(title,actions);box.append(head);if(n.body){const p=document.createElement('p');p.className='note-body';p.textContent=n.body;box.append(p);}root.append(box);}}
$('search').addEventListener('input',render);$('search-clear').onclick=()=>{$('search').value='';render();$('search').focus();};
$('export').onclick=async()=>{if(!flush()){alert('現在のメモを保存できないため、バックアップを開始しません。');return;}const filename='seikei-memo-backup-v09-'+new Date().toISOString().slice(0,10)+'.json';const content=JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);const button=$('export');button.disabled=true;try{const native=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();if(native){const fs=window.Capacitor.Plugins.Filesystem,share=window.Capacitor.Plugins.Share;if(!fs||!share)throw Error('バックアップ機能がインストールされていません');const result=await fs.writeFile({path:filename,data:content,directory:'CACHE',encoding:'utf8'});await share.share({title:'聖契戦姫メモのバックアップ',text:'バックアップJSONファイルを保存してください',url:result.uri,dialogTitle:'バックアップの保存先を選択'});notify('共有画面を閉じました。保存先でファイルを確認してください');}else{const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('バックアップのダウンロードを開始しました');}}catch(err){console.error('Backup export failed',err);alert('バックアップを保存できませんでした。'+(err&&err.message?'\n'+err.message:''));}finally{button.disabled=false;}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const v=JSON.parse(await file.text());let next;if(v.version===1)next=fromV1(v);else if(validateV2(v)){next=blank();for(const c of CHARACTERS){next.characters[c.id]={scratch:v.characters[c.id].scratch,notes:cleanNotes(v.characters[c.id].notes)};}}else throw Error('形式が違います');if(loadError){alert('現在の保存データに読み込みエラーがあるため、復元を中止しました。');return;}if(!confirm('現在の4人分のメモをバックアップ内容で置き換えますか？\n現在の内容は上書きされます。'))return;try{MemoStorage.write(KEY,JSON.stringify(next));}catch(err){console.error('Restore write failed',err);alert('復元データを保存できませんでした。現在の画面は変更していません。');return;}state=next;selected='kirsche';setCharacter('kirsche');renderHome();notify('バックアップを復元しました');}catch(err){console.error('Backup import failed',err);alert('読み込めないバックアップファイルです。');}finally{e.target.value='';}};
setCharacter('kirsche');
renderHome();
if(loadError)setTimeout(()=>alert('保存データの読み込みに失敗しました。既存データを保護するため、編集せずにアプリを閉じてください。'),100);
})();
