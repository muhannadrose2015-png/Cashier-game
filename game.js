// الإعدادات
const ITEMS = {
    "حليب": { price: 1500, emoji: "🥛" },
    "خبز": { price: 500, emoji: "🍞" },
    "كيك": { price: 2000, emoji: "🍰" },
    "جبن": { price: 2500, emoji: "🧀" },
    "عصير": { price: 1000, emoji: "🧃" },
    "بيض": { price: 750, emoji: "🥚" },
    "ماء": { price: 250, emoji: "💧" },
    "شوكولاتة": { price: 1500, emoji: "🍫" }
};

const DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const UPGRADES = {
    shelf: { cost: 75000, bought: false },
    chair: { cost: 125000, bought: false },
    employee: { cost: 400000, bought: false },
    expand: { cost: 1000000, bought: false }
};

// حالة اللعبة
let money = 50000;
let dayIndex = 0;
let time = 8 * 60;
let dayActive = false;
let customer = null;
let angerInterval = null;
let dayInterval = null;
let combo = 0;
let totalCustomers = 0;
let dailyCustomers = 0;
let marketShare = { player: 10, comp1: 30, comp2: 30, comp3: 30 };
let currentInput = "";
let employeeInterval = null;

// نظام المخزون والإيجار والإحصائيات
let inventory = {};
const INITIAL_STOCK = 15;
const RESTOCK_COST = 50000;
let dailyProfit = 0;
let daysPlayed = 0;
let bestDailyProfit = 0;
let bestCombo = 0;
const RENT_AMOUNT = 200000;
const RENT_PERIOD = 7;

// عناصر DOM
const moneyDiv = document.getElementById('money');
const dayDiv = document.getElementById('day');
const timeDiv = document.getElementById('time');
const comboDiv = document.getElementById('combo');
const customerDiv = document.getElementById('customer');
const orderBox = document.getElementById('orderBox');
const angerFill = document.getElementById('angerFill');
const customerFace = document.getElementById('customerFace');
const priceDisplay = document.getElementById('priceDisplay');
const startDayBtn = document.getElementById('startDayBtn');
const shelf1 = document.getElementById('shelf1');
const shelf2 = document.getElementById('shelf2');

// تهيئة اللعبة
function initGame() {
    updateUI();
    updatePriceList();
    initInventory();
    updateShelvesDisplay();
}

function initInventory() {
    Object.keys(ITEMS).forEach(name => {
        inventory[name] = INITIAL_STOCK;
    });
}

function getStockIcons(itemName) {
    const qty = inventory[itemName];
    const emoji = ITEMS[itemName].emoji;
    if (qty <= 0) return "";
    if (qty >= 10) return emoji.repeat(4);
    if (qty >= 7) return emoji.repeat(3);
    if (qty >= 4) return emoji.repeat(2);
    return emoji;
}

function updateShelvesDisplay() {
    const itemNames = Object.keys(ITEMS);
    shelf1.innerHTML = "";
    shelf2.innerHTML = "";
    itemNames.forEach((name, index) => {
        const icons = getStockIcons(name);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shelf-item' + (icons? '' : ' empty');
        itemDiv.innerHTML = `<div class="stock-icons">${icons || ITEMS[name].emoji}</div>`;
        if (index < 4) shelf1.appendChild(itemDiv);
        else shelf2.appendChild(itemDiv);
    });
}

function spawnCustomer() {
    if (customer ||!dayActive) return;

    const itemNames = Object.keys(ITEMS);
    const minItems = UPGRADES.shelf.bought? 3 : 2;
    const maxItems = UPGRADES.shelf.bought? 5 : 4;
    const orderSize = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    const order = [];
    let totalPrice = 0;
    const usedItems = [];

    for (let i = 0; i < orderSize; i++) {
        let randomItem;
        do {
            randomItem = itemNames[Math.floor(Math.random() * itemNames.length)];
        } while (usedItems.includes(randomItem));
        usedItems.push(randomItem);

        const availableQty = inventory[randomItem];
        const maxQty = availableQty > 0? Math.min(3, availableQty) : 3;
        const qty = Math.floor(Math.random() * maxQty) + 1;

        order.push({
            name: randomItem,
            qty: qty,
            available: availableQty >= qty
        });

        if (availableQty >= qty) {
            totalPrice += ITEMS[randomItem].price * qty;
        }
    }

    customer = {
        order: order,
        totalPrice: totalPrice,
        anger: 100,
        maxAnger: UPGRADES.chair.bought? 150 : 100,
        waiting: false
    };

    let orderHTML = "";
    customer.order.forEach(item => {
        const style = item.available? '' : 'style="text-decoration: line-through; opacity: 0.5; color: #e74c3c;"';
        const unavailableText = item.available? '' : ' <span style="font-size:9px;">نافذ</span>';
        orderHTML += `<div class="order-item" ${style}>
            <span>${item.name}${unavailableText}</span>
            <span>x${item.qty}</span>
        </div>`;
    });
    orderHTML += `<div id="orderTotal" class="order-item"><span>المجموع</span><span>???</span></div>`;
    orderBox.innerHTML = orderHTML;

    customerFace.textContent = '😊';
    customerDiv.style.display = "block";
    setTimeout(() => {
        customerDiv.classList.add('show');
        customer.waiting = true;
    }, 50);
}

function checkPrice() {
    if (!customer ||!dayActive) return;
    const enteredPrice = parseInt(currentInput);
    if (isNaN(enteredPrice)) return;

    if (enteredPrice === customer.totalPrice) {
        let soldItems = 0;
        customer.order.forEach(item => {
            if (item.available) {
                inventory[item.name] -= item.qty;
                soldItems++;
            }
        });
        updateShelvesDisplay();

        if (soldItems > 0) {
            combo++;
            const bonus = 1 + combo * 0.1;
            const earnedMoney = Math.floor(customer.totalPrice * bonus);
            money += earnedMoney;
            dailyProfit += earnedMoney;
            if (combo > bestCombo) bestCombo = combo;
            marketShare.player = Math.min(100, marketShare.player + 0.5);
            showFloatingText(`+${earnedMoney.toLocaleString()} د.ع`, "#2ecc71");
            if (combo > 1) comboDiv.textContent = `Combo x${combo}!`;
        } else {
            combo = 0;
            comboDiv.textContent = "";
            showFloatingText("كل المواد نافذة!", "#f39c12");
            customerFace.textContent = '😒';
        }

        customerLeave(true);
    } else {
        customer.anger -= 25;
        combo = 0;
        comboDiv.textContent = "";
        showFloatingText("خطأ!", "#e74c3c");
        customerFace.textContent = '😠';
        updateAngerBar();
    }
    currentInput = "";
    updateUI();
}

function restockAll() {
    if (money >= RESTOCK_COST) {
        money -= RESTOCK_COST;
        initInventory();
        updateShelvesDisplay();
        updateStockBuyList();
        showFloatingText("تم تعبئة المخزن!", "#2ecc71");
        updateUI();
    } else {
        showFloatingText("فلوسك ما تكفي", "#e74c3c");
    }
}

function buyStock(itemName) {
    const buyPrice = 1000;
    const qty = 5;
    const totalCost = buyPrice * qty;
    if (money >= totalCost) {
        money -= totalCost;
        inventory[itemName] += qty;
        updateShelvesDisplay();
        updateStockBuyList();
        updateUI();
        showFloatingText(`اشتريت ${qty} ${itemName}`, "#2ecc71");
    }
}

function payRent() {
    if (money >= RENT_AMOUNT) {
        money -= RENT_AMOUNT;
        showFloatingText("تم دفع الإيجار -" + RENT_AMOUNT.toLocaleString(), "#e74c3c");
        return true;
    } else {
        alert("لعبة انتهت! ما قدرت تدفع الإيجار 💀");
        location.reload();
        return false;
    }
}

function startDay() {
    if (dayActive) return;
    dayActive = true;
    time = 8 * 60;
    dailyCustomers = 0;
    dailyProfit = 0;
    startDayBtn.disabled = true;
    dayInterval = setInterval(updateTime, 1000);
    setTimeout(spawnCustomer, 2000);
    if (UPGRADES.employee.bought &&!employeeInterval) {
        employeeInterval = setInterval(autoServeCustomer, 10000);
    }
}

function updateTime() {
    if (!dayActive) return;
    time += 5;
    if (time >= 22 * 60) endDay();
    if (customer && customer.waiting) {
        customer.anger -= 0.8;
        updateAngerBar();
        if (customer.anger <= 0) customerLeave(false);
    }
    updateUI();
}

function updateUI() {
    moneyDiv.textContent = money.toLocaleString() + " د.ع";
    dayDiv.textContent = DAYS[dayIndex];
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    timeDiv.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    priceDisplay.textContent = currentInput || "0";
    updateMarketBar();
    updateUpgradeButtons();
}

function customerLeave(happy) {
    if (!customer) return;
    clearInterval(angerInterval);
    customer.waiting = false;
    if (!happy) {
        combo = 0;
        comboDiv.textContent = "";
        marketShare.player = Math.max(0, marketShare.player - 1);
        showFloatingText("غادر غاضباً", "#e74c3c");
        customerFace.textContent = '😡';
    }
    totalCustomers++;
    dailyCustomers++;
    customerDiv.classList.remove('show');
    setTimeout(() => {
        customerDiv.style.display = "none";
        customer = null;
        if (dayActive) setTimeout(spawnCustomer, 1500 + Math.random() * 2000);
    }, 500);
}

function endDay() {
    dayActive = false;
    clearInterval(dayInterval);
    if (employeeInterval) clearInterval(employeeInterval);
    if (customer) customerLeave(false);
    startDayBtn.disabled = false;

    daysPlayed++;
    if (dailyProfit > bestDailyProfit) bestDailyProfit = dailyProfit;

    if (daysPlayed % RENT_PERIOD === 0) {
        if (!payRent()) return;
    }

    const stats = `زبائن اليوم: ${dailyCustomers}<br>ربح اليوم: ${dailyProfit.toLocaleString()} د.ع<br>الهيمنة: ${marketShare.player.toFixed(1)}%`;
    document.getElementById('endDayStats').innerHTML = stats;
    document.getElementById('endDayModal').style.display = 'flex';
    dayIndex = (dayIndex + 1) % 7;
    dailyProfit = 0;
}

function closeEndDay() {
    document.getElementById('endDayModal').style.display = 'none';
}

function updateAngerBar() {
    const percent = Math.max(0, customer.anger / customer.maxAnger * 100);
    angerFill.style.width = percent + "%";
    if (percent < 30) angerFill.style.background = "#e74c3c";
    else if (percent < 60) angerFill.style.background = "#f39c12";
    else angerFill.style.background = "#2ecc71";
}

function addNum(num) {
    if (currentInput.length < 7) {
        currentInput += num;
        updateUI();
    }
}

function clearNum() {
    currentInput = "";
    updateUI();
}

function showFloatingText(text, color) {
    const ft = document.createElement('div');
    ft.className = 'floating-text';
    ft.textContent = text;
    ft.style.color = color;
    document.getElementById('gameArea').appendChild(ft);
    setTimeout(() => ft.remove(), 1000);
}

function updateMarketBar() {
    document.getElementById('playerMarket').style.width = marketShare.player + "%";
    document.getElementById('playerMarket').textContent = marketShare.player.toFixed(0) + "%";
    const remaining = 100 - marketShare.player;
    document.getElementById('comp1Market').style.width = remaining * 0.33 + "%";
    document.getElementById('comp2Market').style.width = remaining * 0.33 + "%";
    document.getElementById('comp3Market').style.width = remaining * 0.34 + "%";
}

function togglePriceList() {
    const modal = document.getElementById('priceListModal');
    modal.style.display = modal.style.display === 'flex'? 'none' : 'flex';
}

function updatePriceList() {
    const list = document.getElementById('priceListItems');
    list.innerHTML = "";
    Object.entries(ITEMS).forEach(([name, data]) => {
        list.innerHTML += `<div class="price-item"><span>${data.emoji} ${name}</span><span>${data.price.toLocaleString()}</span></div>`;
    });
}

function toggleComputer() {
    const modal = document.getElementById('computerModal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        updateComputerData();
        modal.style.display = 'flex';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
    if (tabName === 'stock') updateStockBuyList();
}

function updateComputerData() {
    document.getElementById('comp-money').textContent = money.toLocaleString() + ' د.ع';
    document.getElementById('comp-daily-profit').textContent = dailyProfit.toLocaleString() + ' د.ع';
    const daysLeft = RENT_PERIOD - (daysPlayed % RENT_PERIOD);
    document.getElementById('comp-rent-days').textContent = daysLeft + ' أيام';
    document.getElementById('comp-rent-amount').textContent = RENT_AMOUNT.toLocaleString() + ' د.ع';
    document.getElementById('comp-market').textContent = marketShare.player.toFixed(1) + '%';
    document.getElementById('comp-total-customers').textContent = totalCustomers;
    document.getElementById('comp-best-day').textContent = bestDailyProfit.toLocaleString() + ' د.ع';
    document.getElementById('comp-best-combo').textContent = bestCombo;
    document.getElementById('comp-days-played').textContent = daysPlayed;
}

function updateStockBuyList() {
    const list = document.getElementById('stockBuyList');
    list.innerHTML = '';
    const buyPrice = 1000;
    Object.entries(ITEMS).forEach(([name, data]) => {
        const canBuy = money >= buyPrice * 5;
        list.innerHTML += `
        <div class="stock-buy-item">
            <span>${data.emoji} ${name} (${inventory[name]})</span>
            <button class="stock-buy-btn" onclick="buyStock('${name}')" ${!canBuy? 'disabled' : ''}>
                شراء +5 (${(buyPrice*5).toLocaleString()})
            </button>
        </div>`;
    });
}

function buyUpgrade(type) {
    const upg = UPGRADES[type];
    if (money >= upg.cost &&!upg.bought) {
        money -= upg.cost;
        upg.bought = true;
        if (type === 'expand') document.body.classList.add('expanded');
        if (type === 'employee') employeeInterval = setInterval(autoServeCustomer, 10000);
        showFloatingText("تم الشراء!", "#2ecc71");
        updateUI();
    }
}

function updateUpgradeButtons() {
    Object.keys(UPGRADES).forEach(type => {
        const btn = document.getElementById('upg-' + type);
        if (btn) {
            if (UPGRADES[type].bought) {
                btn.textContent = "✓";
                btn.disabled = true;
            } else {
                btn.textContent = UPGRADES[type].cost.toLocaleString();
                btn.disabled = money < UPGRADES[type].cost;
            }
        }
    });
}

function autoServeCustomer() {
    if (customer && customer.waiting && dayActive) {
        currentInput = customer.totalPrice.toString();
        checkPrice();
    }
}

// تشغيل
initGame();