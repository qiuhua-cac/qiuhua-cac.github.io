// character/dsl.js
// 无名杀技能 DSL 翻译层
// 作用：把简洁的 defineSkill DSL 翻译成无名杀能识别的 lib.skill.xxx

import { lib, game, ui, get, ai, _status } from "../noname.js";

// ============================================================
// 一、语义事件名映射表
// 用户写 "shaTargeted"，翻译层转成无名杀的真实事件名
// ============================================================
const EVENT_MAP = {
	// 使用牌相关
	shaTargeted: { player: "useCardToPlayered", target: "useCardToTargeted" },
	cardTargeted: { player: "useCardToPlayered", target: "useCardToTargeted" },
	cardUsed: { player: "useCardAfter" },
	cardResponded: { player: "respondAfter" },

	// 回合相关
	turnStart: { player: "phaseZhunbeiBegin" },
	turnEnd: { player: "phaseJieshuBegin" },
	drawPhase: { player: "phaseDrawBegin" },
	playPhase: { player: "phaseUseBegin" },
	discardPhase: { player: "phaseDiscardBegin" },

	// 伤害相关
	damaged: { player: "damageEnd" },
	damageSource: { source: "damageSource" },

	// 体力相关
	recovered: { player: "recoverEnd" },
	lostHp: { player: "loseHpEnd" },

	// 濒死
	dying: { global: "dying" },

	// 摸牌
	drawEnd: { player: "drawEnd" },

	// 获得牌
	gainEnd: { player: "gainEnd" },
};

// 需要全局监听的事件（不是 player / target / source 视角）
const GLOBAL_EVENTS = ["dying"];

// ============================================================
// 二、ctx 对象工厂
// 每次技能触发，都为本次触发创建一个 ctx
// ============================================================
function createContext(event, trigger, player, skillName) {
	const ctx = {
		// ----- 基础引用 -----
		player: player,
		trigger: trigger,
		event: event,
		skill: skillName,

		// ----- 常用事件字段，方便直接用 -----
		get target() {
			if (!trigger) return null;
			if (trigger.target) return trigger.target;
			if (trigger.targets && trigger.targets.length === 1) return trigger.targets[0];
			return null;
		},
		get card() {
			return trigger ? trigger.card : null;
		},
		get source() {
			return trigger ? trigger.source || trigger.player : null;
		},

		// ----- storage 管理 -----
		storage: {
			_prefix: skillName + "_",
			set(key, value) {
				player.storage[this._prefix + key] = value;
			},
			get(key) {
				return player.storage[this._prefix + key];
			},
			clear(key) {
				if (key === undefined) {
					// 清空本技能所有 storage
					for (const k in player.storage) {
						if (k.startsWith(this._prefix)) {
							delete player.storage[k];
						}
					}
				} else {
					delete player.storage[this._prefix + key];
				}
			},
		},

		// ----- 快捷动作 -----
		async draw(n = 1) {
			await player.draw(n);
		},

		async gainCard(target, position = "h", n = 1) {
			// 从目标拿牌，position 是 "h"（手牌）/"he"（手牌装备）/"e"（装备）
			const result = await player
				.gainPlayerCard(target, position, true, "gain2")
				.forResult();
			return result;
		},

		async discard(target, position = "he", n = 1) {
			const result = await target
				.chooseToDiscard(n, position, true)
				.forResult();
			return result;
		},

		async useVirtual(name, target) {
			// 视为使用一张虚拟牌
			// 防御：target 必须存在、非数组、在游戏中
			if (!target) {
				console.error(`[DSL] useVirtual 缺少 target`);
				return;
			}
			if (Array.isArray(target)) {
				console.error(`[DSL] useVirtual 暂不支持数组 target，请传单个角色`);
				return;
			}
			if (target.isIn && !target.isIn()) {
				console.error(`[DSL] useVirtual 的 target 已不在游戏中`);
				return;
			}
			const card = { name: name, isCard: true };
			await player.useCard(card, target);
		},

		async loseHp(n = 1) {
			await player.loseHp(n);
		},

		async damage(target, n = 1, nature = null) {
			await target.damage(n, nature);
		},

		async recover(target, n = 1) {
			const t = target || player;
			await t.recover(n);
		},

		// ----- 技能管理 -----
		addSkill(name) {
			player.addSkill(name);
		},

		addTempSkill(name, expire) {
			player.addTempSkill(name, expire);
		},

		removeSkill(name) {
			player.removeSkill(name);
		},

		// ----- 判断 -----
		isLockedSkill(name) {
			const skill = lib.skill[name];
			if (!skill) return false;
			return !!(skill.locked || skill.forced);
		},

		// ----- 日志 -----
		log(...args) {
			game.log(player, ...args);
		},

		popup(text) {
			player.popup(text);
		},
	};

	return ctx;
}

// ============================================================
// 三、把 DSL 的 on / trigger 结构翻译成无名杀的 trigger 字段
// ============================================================
function translateTrigger(dsl) {
	// 情况 1：扁平写法 { trigger: "shaTargeted", filter, run }
	if (dsl.trigger) {
		const mapped = EVENT_MAP[dsl.trigger];
		if (!mapped) {
			console.error(`[DSL] 未知事件名: ${dsl.trigger}，请检查 EVENT_MAP`);
			return null;
		}
		// 校验映射到的无名杀事件名是否真实存在（仅当 hookmap 已有内容时）
		if (Object.keys(lib.hookmap).length > 0) {
			for (const key in mapped) {
				const realName = mapped[key];
				if (!lib.hookmap[realName]) {
					console.warn(
						`[DSL] 事件名 "${dsl.trigger}" 映射到 "${realName}"，当前 hookmap 里没查到。` +
						`注意：可能只是注册时机太早，不代表事件不存在。`
					);
				}
			}
		}
		return { trigger: mapped, handlers: [{ filter: dsl.filter, run: dsl.run, dslName: dsl.trigger }] };
	}

	// 情况 2：on 写法 { on: { shaTargeted: { filter, run } } }
	if (dsl.on) {
		const handlers = [];
		let mergedTrigger = null;
		for (const eventName in dsl.on) {
			const mapped = EVENT_MAP[eventName];
			if (!mapped) {
				console.error(`[DSL] 未知事件名: ${eventName}，请检查 EVENT_MAP`);
				continue;
			}
			// 校验映射到的无名杀事件名是否真实存在（仅当 hookmap 已有内容时）
			if (Object.keys(lib.hookmap).length > 0) {
				for (const key in mapped) {
					const realName = mapped[key];
					if (!lib.hookmap[realName]) {
						console.warn(
							`[DSL] 事件名 "${eventName}" 映射到 "${realName}"，当前 hookmap 里没查到。` +
							`注意：可能只是注册时机太早，不代表事件不存在。`
						);
					}
				}
			}
			// 合并 trigger 字段
			if (!mergedTrigger) {
				mergedTrigger = {};
			}
			for (const key in mapped) {
				mergedTrigger[key] = mapped[key];
			}
			const handler = dsl.on[eventName];
			handlers.push({
				filter: handler.filter,
				run: handler.run,
				dslName: eventName,
			});
		}
		return { trigger: mergedTrigger, handlers };
	}

	console.error("[DSL] defineSkill 缺少 trigger 或 on 字段");
	return null;
}

// ============================================================
// 四、主函数：defineSkill
// ============================================================
export function defineSkill(name, dsl) {
	const translated = translateTrigger(dsl);
	if (!translated) return;

	const { trigger, handlers } = translated;

	// 构建无名杀的技能对象
	const skill = {
		trigger: trigger,
		forced: dsl.forced || false,
		popup: dsl.popup !== undefined ? dsl.popup : true,
		audio: dsl.audio || 2,
		logTarget: dsl.logTarget,
		_priority: dsl.priority || 0,

		// 核心：把多个 handler 合并成一个 content
		async content(event, trigger, player) {
			// ----- 循环保护：同一技能 2 秒内触发超过 50 次，强制中断 -----
			if (!player._dsl_loop_guard) player._dsl_loop_guard = {};
			const guardKey = name;
			const now = Date.now();
			if (!player._dsl_loop_guard[guardKey]) {
				player._dsl_loop_guard[guardKey] = { count: 0, start: now };
			}
			const guard = player._dsl_loop_guard[guardKey];
			if (now - guard.start > 2000) {
				guard.count = 0;
				guard.start = now;
			}
			guard.count++;
			if (guard.count > 50) {
				console.error(`[DSL] 技能 ${name} 在 2 秒内触发超过 50 次，疑似死循环，已强制中断。`);
				return;
			}

			// 找出当前触发对应哪个 handler
			// 通过 trigger.name（无名杀事件名）反查 dslName
			const triggerName = trigger.name;
			let matched = null;
			for (const h of handlers) {
				const mapped = EVENT_MAP[h.dslName];
				if (!mapped) continue;
				// 检查 triggerName 是否匹配 mapped 里的任意值
				for (const key in mapped) {
					if (mapped[key] === triggerName) {
						matched = h;
						break;
					}
				}
				if (matched) break;
			}

			if (!matched) {
				// 如果找不到匹配，默认用第一个 handler
				matched = handlers[0];
			}

			// 创建 ctx
			const ctx = createContext(event, trigger, player, name);

			// 执行 filter（如果有）
			if (matched.filter) {
				try {
					const ok = matched.filter(ctx);
					if (!ok) return;
				} catch (e) {
					console.error(`[DSL] 技能 ${name} 的事件 "${matched.dslName}" 的 filter 出错:`, e);
					return;
				}
			}

			// 执行 run
			if (matched.run) {
				try {
					await matched.run(ctx);
				} catch (e) {
					console.error(`[DSL] 技能 ${name} 的事件 "${matched.dslName}" 的 run 出错:`, e);
				}
			}
		},

		// 技能移除时清理 storage
		onremove(player) {
			for (const k in player.storage) {
				if (k.startsWith(name + "_")) {
					delete player.storage[k];
				}
			}
		},
	};

	// 注册到 lib.skill
	lib.skill[name] = skill;

	return skill;
}

// ============================================================
// 五、辅助：把 DSL 技能挂到武将身上
// 这个函数帮你把技能名写进武将数据里
// ============================================================
export function attachSkillToGeneral(generalName, skillNames) {
	if (!lib.character[generalName]) {
		console.error(`[DSL] 武将 ${generalName} 不存在`);
		return;
	}
	const info = lib.character[generalName];
	if (!info[3]) info[3] = [];
	for (const s of skillNames) {
		if (!info[3].includes(s)) info[3].push(s);
	}
}
