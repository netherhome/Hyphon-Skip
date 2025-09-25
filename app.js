let currentUser = null;
let userData = { cards: [], coins: 0, quests: {} };
let swipeQueue = [];

// ----- LOGIN -----
document.getElementById("loginBtn").onclick = () => {
    const username = document.getElementById("username").value.trim();
    if (!username) return alert("Enter a username");
    currentUser = username;
    db.ref('users/' + username).once('value').then(snapshot => {
        if (snapshot.exists()) userData = snapshot.val();
        else {
            userData = { cards: [], coins: 0, quests: {} };
            db.ref('users/' + username).set(userData);
        }
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        renderCards(); renderQuests(); renderCoins(); loadSwipeQueue();
    });
};

// ----- TABS -----
document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
});

// ----- CREATE CARD -----
document.getElementById("createCardBtn").onclick = () => {
    const text = document.getElementById("card-text").value.trim();
    const file = document.getElementById("card-media").files[0];
    if (!text && !file) return alert("Add text or media");
    const card = { text, media: null, likes:0, views:0, created:Date.now(), boosted:false };
    
    if(file){
        const reader = new FileReader();
        reader.onload = e => {
            card.media = e.target.result;
            userData.cards.push(card); saveData(); renderCards(); checkQuests(); loadSwipeQueue();
        }
        reader.readAsDataURL(file);
    } else {
        userData.cards.push(card); saveData(); renderCards(); checkQuests(); loadSwipeQueue();
    }
};

// ----- RENDER USER CARDS -----
function renderCards() {
    const container = document.getElementById("user-cards");
    container.innerHTML = '';
    userData.cards.forEach((c, i) => {
        const div = document.createElement('div'); div.className='card';
        div.innerHTML = `<strong>Text:</strong> ${c.text || ''}<br>
                         ${c.media? `<div class="card-media">${renderMedia(c.media)}</div>` : ''}
                         <small>Likes: ${c.likes} Views: ${c.views}</small>
                         <br><button onclick="boostCard(${i})">Boost (1 coin)</button>`;
        container.appendChild(div);
    });
}

// ----- BOOST CARD -----
function boostCard(index){
    if(userData.coins < 1) return alert("Not enough coins!");
    userData.coins -=1;
    userData.cards[index].boosted = true;
    saveData(); renderCoins(); renderCards(); loadSwipeQueue();
}

// ----- MEDIA RENDER -----
function renderMedia(data) {
    if(data.startsWith('data:image')) return `<img src="${data}" class="card-media">`;
    if(data.startsWith('data:video')) return `<video src="${data}" class="card-media" controls></video>`;
    if(data.startsWith('data:audio')) return `<audio src="${data}" class="card-media" controls></audio>`;
    return '';
}

// ----- SAVE DATA -----
function saveData() {
    db.ref('users/' + currentUser).set(userData);
}

// ----- QUESTS -----
const quests = [
    { path:1, goals:[10,25,50,100,250], coins:[1,2,3,5,10], key:'cards' },
    { path:2, goals:[5,10,30,50,100,500], coins:[1,2,3,5,10,20], key:'likes' },
    { path:3, goals:[10,40,50,200,500], coins:[1,2,3,5,10], key:'views' }
];

function renderQuests() {
    const container = document.getElementById("quests-list");
    container.innerHTML = '';
    quests.forEach(q => {
        const div = document.createElement('div');
        div.innerHTML = `<h4>Path ${q.path}</h4>`;
        q.goals.forEach((g,i)=>{
            const achieved = checkQuestProgress(q.key,g);
            div.innerHTML += `<div>${g} ${q.key} - ${achieved ? '✅':'❌'} - Reward: ${q.coins[i]} coins</div>`;
        });
        container.appendChild(div);
    });
}

function renderCoins() { document.getElementById("coin-count").textContent = userData.coins; }

function checkQuestProgress(key,goal){
    let val = 0;
    if(key=='cards') val=userData.cards.length;
    if(key=='likes') val=userData.cards.reduce((a,b)=>a+b.likes,0);
    if(key=='views') val=userData.cards.reduce((a,b)=>a+b.views,0);
    return val >= goal;
}

function checkQuests() {
    quests.forEach(q=>{
        q.goals.forEach((g,i)=>{
            const id = `${q.key}-${g}`;
            if(checkQuestProgress(q.key,g) && !userData.quests[id]){
                userData.quests[id]=true;
                userData.coins += q.coins[i];
                renderCoins(); saveData();
            }
        });
    });
}

// ----- SWIPE SYSTEM -----
function loadSwipeQueue(){
    db.ref('users').once('value').then(snapshot=>{
        swipeQueue = [];
        snapshot.forEach(userSnap => {
            if(userSnap.key === currentUser) return;
            const cards = userSnap.val().cards || [];
            cards.forEach(c=>{
                swipeQueue.push({ ...c, owner:userSnap.key });
            });
        });
        swipeQueue.sort((a,b)=> b.boosted ? -1 : 0); // boosted first
        renderNextSwipe();
    });
}

function renderNextSwipe(){
    const area = document.getElementById("swipe-area");
    area.innerHTML = '';
    if(swipeQueue.length ===0){ area.innerHTML = "No more cards!"; return; }

    const card = swipeQueue.shift();
    card.views++;
    if(card.boosted) card.boosted = false; // remove boost after first swipe

    db.ref('users/' + card.owner + '/cards').once('value').then(snapshot=>{
        snapshot.forEach((snap,index)=>{
            if(snap.val().created===card.created){
                db.ref(`users/${card.owner}/cards/${index}/views`).set(card.views);
            }
        });
    });

    const div = document.createElement('div'); div.className='swipe-card';
    if(card.boosted) div.classList.add('boosted');
    div.innerHTML = `<strong>${card.text || ''}</strong><br>${card.media ? renderMedia(card.media) : ''}`;
    area.appendChild(div);

    let startX = 0, offsetX = 0, isDragging = false;

    div.onpointerdown = e => {
        startX = e.clientX;
        div.setPointerCapture(e.pointerId);
        div.classList.add('dragging');
        offsetX = 0;
        isDragging = true;
    };

    div.onpointermove = e => {
        if(!isDragging) return;
        offsetX = e.clientX - startX;
        div.style.transform = `translateX(${offsetX}px) rotate(${offsetX/10}deg)`;
        if(offsetX > 50) div.classList.add('like'); else div.classList.remove('like');
        if(offsetX < -50) div.classList.add('skip'); else div.classList.remove('skip');
    };

    div.onpointerup = e => {
        div.classList.remove('dragging');
        isDragging = false;
        if(offsetX > 100){ 
            div.style.transform='translateX(120%) rotate(20deg)'; 
            likeCard(card); 
            setTimeout(renderNextSwipe,300); 
        }
        else if(offsetX < -100){ 
            div.style.transform='translateX(-120%) rotate(-20deg)'; 
            setTimeout(renderNextSwipe,300); 
        }
        else {
            div.style.transform='translateX(0) rotate(0deg)';
            div.classList.remove('like','skip');
        }
    };
}

// ----- LIKE CARD -----
function likeCard(card){
    db.ref('users/' + card.owner + '/cards').once('value').then(snapshot=>{
        snapshot.forEach((snap,index)=>{
            if(snap.val().created===card.created){
                const newLikes = (snap.val().likes||0)+1;
                db.ref(`users/${card.owner}/cards/${index}/likes`).set(newLikes);
                checkQuests(); loadSwipeQueue();
            }
        });
    });
}
