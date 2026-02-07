# Slot-RPG "Stamina Reels" — Architecture Blueprint

## 1. Core Loop (Game Cycle)

```
Start Turn -> First Spin -> Auto-Lock -> Player Action -> Resolution -> Enemy Turn
```

| Phase | Description |
|-------|-------------|
| **Start Turn** | Player receives +X stamina (optional) or regenerates it |
| **First Spin** | All 3 reels spin for free |
| **Auto-Lock** | All 3 horizontal lines lock automatically after reels stop |
| **Player Action** | Spend 5 stamina to Unlock a specific line for respin; press "Respin" (only unlocked lines spin); if all 3 lines locked or "End Turn" pressed — proceed to Resolution |
| **Resolution** | Sequential animation of matched combinations; apply damage/healing |
| **Enemy Turn** | Enemy spins its own slot machine and attacks |

## 2. Technical Specifications

- **Engine:** HTML5 Canvas (smooth reel animation) + CSS3 for UI
- **Visual FX:**
  - **Blur Filter:** Applied to sprites during reel movement
  - **Bounce Effect:** `EaseOutBack` easing function for reel stop
  - **Highlight:** Sequential highlighting of winning lines

## 3. Symbol Logic & Probability (Strip Map)

Total symbol pool per strip: **100 units**

| Symbol | Weight | Effect |
|--------|--------|--------|
| Wild | 10% | Substitutes any symbol (except Skull) |
| Sword | 15% | 15 Phys Dmg + player.STR |
| Shield | 15% | Block 15 Phys Dmg + player.DEF |
| Fire | 15% | 10 Mag Dmg + player.INT |
| Heart | 15% | +10 HP & Purge Debuffs |
| Book | 15% | +10 EXP |
| Skull | 15% | Triggers even with 1 symbol on field; activates current debuff |

### Matching Rules
- **3 of a kind** on a horizontal line or diagonal = full effect
- **2 of a kind + Wild** = counts as 3 of a kind
- **Skull** = unique — activates with even 1 instance on the grid

## 4. Class Structure (MVC)

### SlotMachine.js
```
SlotMachine
├── reels: Reel[3]          // Array of 3 reel objects
├── grid: Symbol[3][3]      // Current 3x3 symbol grid
├── lockedLines: bool[3]    // Lock state per horizontal line
├── spin()                  // Spin unlocked reels
├── calculateLines()        // Check 3 horizontals + 2 diagonals
├── toggleLock(lineIndex)   // Spend 5 stamina to unlock a line
└── getResults()            // Return matched combinations
```

### Entity.js (Player & Enemy)
```
Entity
├── stats: { HP, MaxHP, Stamina, MaxStamina, STR, DEF, INT }
├── statusEffects: Effect[] // Active debuffs (poison, bleed, etc.)
├── takeDamage(amount, type)
├── heal(amount)
├── applyEffect(effect)
└── removeEffect(effectId)
```

### AnimationController.js
```
AnimationController
├── queue: Animation[]
├── isPlaying: bool
├── playSequence()          // Spin -> Bounce -> Highlight L1 -> L2 -> ...
├── addToQueue(animation)
└── onComplete(callback)
```

## 5. Game State Flow

```
IDLE -> SPINNING -> LOCKING -> PLAYER_DECISION -> RESOLVING -> ENEMY_TURN -> IDLE
```

### States:
- **IDLE** — waiting for player input
- **SPINNING** — reels are animating
- **LOCKING** — auto-lock phase after spin stops
- **PLAYER_DECISION** — player can unlock lines / respin / end turn
- **RESOLVING** — applying combo effects sequentially
- **ENEMY_TURN** — enemy performs its action

## 6. File Structure

```
stamina-reels/
├── index.html              // Entry point
├── css/
│   └── style.css           // UI styles
├── js/
│   ├── main.js             // Bootstrap & game loop
│   ├── SlotMachine.js      // Reel logic & grid
│   ├── Entity.js           // Player & Enemy
│   ├── AnimationController.js  // Animation queue
│   ├── Renderer.js         // Canvas drawing
│   ├── SymbolDefs.js       // Symbol definitions & weights
│   └── constants.js        // Game constants
└── game_blueprint.md       // This file
```

## 7. UI Layout

```
┌──────────────────────────────────┐
│  HP: ████████ 100/100            │
│  Stamina: ████████ 100/100       │
│  STR: 5  DEF: 5  INT: 5         │
├──────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐  [LOCK] │
│  │ S1 │  │ S2 │  │ S3 │  Line 1 │
│  └────┘  └────┘  └────┘         │
│  ┌────┐  ┌────┐  ┌────┐  [LOCK] │
│  │ S4 │  │ S5 │  │ S6 │  Line 2 │
│  └────┘  └────┘  └────┘         │
│  ┌────┐  ┌────┐  ┌────┐  [LOCK] │
│  │ S7 │  │ S8 │  │ S9 │  Line 3 │
│  └────┘  └────┘  └────┘         │
├──────────────────────────────────┤
│  [ SPIN ]  [ RESPIN ]  [ END ]  │
├──────────────────────────────────┤
│  Combat Log:                     │
│  > Sword x3: 15 + 5 STR = 20dmg │
│  > Heart x2 + Wild: +10 HP      │
└──────────────────────────────────┘
```

## 8. Balance Constants

```javascript
STAMINA_UNLOCK_COST = 5
STAMINA_REGEN_PER_TURN = 10
BASE_PHYS_DMG = 15
BASE_MAG_DMG = 10
BASE_BLOCK = 15
BASE_HEAL = 10
BASE_EXP = 10
PLAYER_START_HP = 100
PLAYER_START_STAMINA = 100
```
