// DOM 元素
const boardEl = document.getElementById('gameBoard');
const scoreSpan = document.getElementById('score');
const timerSpan = document.getElementById('timer');
const playerNameInput = document.getElementById('playerName');
const startBtn = document.getElementById('startBtn');
const leaderboardBody = document.getElementById('leaderboardBody');

// 游戏状态
let score = 0;
let timeLeft = 30;
let gameActive = false;
let activeTimers = [];      // 存储每个格子的消失定时器
let moleInterval = null;     // 生成地鼠的主定时器
let countdownInterval = null;

// 格子相关
let cells = [];
const GRID_SIZE = 6; // 6x6

// 初始化游戏板
function createBoard() {
    boardEl.innerHTML = '';
    cells = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', () => onCellClick(i));
        boardEl.appendChild(cell);
        cells.push(cell);
    }
}

// 点击格子逻辑
function onCellClick(index) {
    if (!gameActive) return;
    const cell = cells[index];
    if (cell.classList.contains('active')) {
        // 打中地鼠
        score += 10;
        scoreSpan.innerText = score;
        // 移除地鼠和定时器
        deactivateMole(index);
        // 播放微小动画 (可选)
        cell.style.transform = 'scale(0.9)';
        setTimeout(() => { if(cell) cell.style.transform = ''; }, 100);
    }
}

// 激活某个格子为地鼠
function activateMole(index) {
    if (!gameActive) return;
    const cell = cells[index];
    if (!cell || cell.classList.contains('active')) return;
    cell.classList.add('active');
    // 设置自动消失定时器（1.2秒后如果没有被打）
    const timeoutId = setTimeout(() => {
        if (cell && cell.classList.contains('active')) {
            deactivateMole(index);
        }
    }, 1200);
    activeTimers[index] = timeoutId;
}

// 取消激活地鼠
function deactivateMole(index) {
    const cell = cells[index];
    if (!cell) return;
    cell.classList.remove('active');
    if (activeTimers[index]) {
        clearTimeout(activeTimers[index]);
        activeTimers[index] = null;
    }
}

// 清除所有地鼠
function clearAllMoles() {
    for (let i = 0; i < cells.length; i++) {
        deactivateMole(i);
    }
}

// 随机生成1~3只新地鼠（避开已有地鼠的位置）
function spawnMoles() {
    if (!gameActive) return;
    // 获取当前未激活的格子索引
    const inactiveIndices = [];
    for (let i = 0; i < cells.length; i++) {
        if (!cells[i].classList.contains('active')) {
            inactiveIndices.push(i);
        }
    }
    if (inactiveIndices.length === 0) return;
    // 随机生成数量 1~3 但不能超过未激活数量
    let count = Math.min(Math.floor(Math.random() * 3) + 1, inactiveIndices.length);
    // 随机选取 count 个不同索引
    for (let i = 0; i < count; i++) {
        const randPos = Math.floor(Math.random() * inactiveIndices.length);
        const cellIdx = inactiveIndices[randPos];
        activateMole(cellIdx);
        // 从数组中移除已选中的，避免重复
        inactiveIndices.splice(randPos, 1);
    }
}

// 开始倒计时
function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (!gameActive) return;
        if (timeLeft <= 1) {
            // 游戏结束
            endGame();
        } else {
            timeLeft--;
            timerSpan.innerText = timeLeft;
        }
    }, 1000);
}

// 结束游戏
async function endGame() {
    if (!gameActive) return;
    gameActive = false;
    // 停止所有游戏循环
    if (moleInterval) {
        clearInterval(moleInterval);
        moleInterval = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    clearAllMoles();
    
    // 弹出提示并保存分数
    const playerName = playerNameInput.value.trim();
    const finalName = playerName === "" ? "匿名勇士" : playerName;
    const finalScore = score;
    
    alert(`游戏结束！\n${finalName} 获得了 ${finalScore} 分！`);
    
    // 保存分数到数据库
    try {
        await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName: finalName, score: finalScore })
        });
        // 刷新排行榜
        await loadLeaderboard();
    } catch (err) {
        console.error('保存分数失败', err);
    }
    
    // 重置按钮状态
    startBtn.disabled = false;
    startBtn.innerText = '开始游戏';
}

// 开始新游戏
function startGame() {
    if (gameActive) return;
    // 重置变量
    gameActive = true;
    score = 0;
    timeLeft = 30;
    scoreSpan.innerText = '0';
    timerSpan.innerText = '30';
    // 清除所有残余地鼠和定时器
    clearAllMoles();
    if (moleInterval) clearInterval(moleInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    activeTimers = new Array(cells.length).fill(null);
    
    // 启动生成地鼠（每 0.8 秒生成一次）
    moleInterval = setInterval(() => {
        spawnMoles();
    }, 800);
    
    // 启动倒计时
    startCountdown();
    
    // UI 调整
    startBtn.disabled = true;
    startBtn.innerText = '游戏中...';
}

// 加载排行榜
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/scores');
        const scores = await response.json();
        if (scores.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3">暂无记录，快来成为第一！</td></tr>';
            return;
        }
        let html = '';
        scores.forEach(entry => {
            const date = new Date(entry.created_at);
            const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2,'0')}`;
            html += `<tr><td>${escapeHtml(entry.player_name)}</td><td>${entry.score}</td><td>${dateStr}</td></tr>`;
        });
        leaderboardBody.innerHTML = html;
    } catch (err) {
        console.error('加载排行榜失败', err);
        leaderboardBody.innerHTML = '<tr><td colspan="3">加载失败，请刷新页面</td></tr>';
    }
}

// 辅助防XSS
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 事件绑定
startBtn.addEventListener('click', startGame);

// 初始化页面
createBoard();
loadLeaderboard();
// 页面加载后每30秒自动刷新排行榜
setInterval(loadLeaderboard, 30000);
