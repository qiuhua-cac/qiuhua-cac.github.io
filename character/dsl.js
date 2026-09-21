// character/dsl.js
// 无名杀技能 DSL 翻译层

import { lib, game, ui, get, ai, _status } from "../noname.js";

const EVENT_MAP = {
	shaTargeted: { player: "useCardToPlayered", target: "useCardToTargeted" },
	cardTargeted: { player: "useCardToPlayered", target: "useCardToTargeted" },
	cardUsed: { player: "useCardAfter" },
	cardResponded: { player: "respondAfter" },
	turnStart: { player: "phaseZhunbeiBegin" },
	turnEnd: { player: "phaseJieshuBegin" },
	drawPhase: { player: "phaseDrawBegin" },
	playPhase: { player: "phaseUseBegin" },
	discardPhase: { player: "phaseDiscardBegin" },
	damaged: { player: "damageEnd" },
	damageSource: { source: "damageSource" },
	recovered: { player: "recoverEnd" },
	lostHp: { player: "loseHpEnd" },
	dying: { global: "dying" },
	drawEnd: { player: "drawEnd" },
	gainEnd: { player: "gainEnd" },
};

const GLOBAL_EVENTS = ["dying"];

function createContext(event, trigger, player, skillName) {
	const ctx = {
		player: player,
		trigger: trigger,
		event: event,
		skill: skillName,

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

		async draw(n = 1) {
			await player.draw(n);
		},

		async gainCard(target, position = "h", n = 1) {
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
			const card = { name: name, isCard: true, cards: [], virtual: true };
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

		async chooseControl(...options) {
			// 简单单选：弹窗给玩家选一个，返回选中的字符串
			// 用法：const r = await ctx.chooseControl("选项A", "选项B");
			const result = await player
				.chooseControl(...options)
				.set("ai", () => options[0])
				.forResultControl();
			return result;
		},

		async chooseButtonFromList(title, list, multi = false) {
			// 从结构化列表选按钮，返回选中项数组（每项是 [分类, 副标题, 名字]）
			// 用法：const links = await ctx.chooseButtonFromList("请选择", [["分类","副标题","名字"], ...], false);
			// links[0] 是选中项
			const links = await player
				.chooseButton([title, [list, "vcard"]], multi)
				.set("ai", (button) => {
					if (button && button.link && button.link[2] && lib.skill[button.link[2]]) {
						return get.skillRank ? get.skillRank(button.link[2]) : 1;
					}
					return 1;
				})
				.forResultLinks();
			return links;
		},

		addSkill(name) {
			player.addSkill(name);
		},

		addTempSkill(name, expire) {
			player.addTempSkill(name, expire);
		},

		removeSkill(name) {
			player.removeSkill(name);
		},

		isLockedSkill(name) {
			const skill = lib.skill[name];
			if (!skill) return false;
			return !!(skill.locked || skill.forced);
		},

		log(...args) {
			game.log(player, ...args);
		},

		popup(text) {
			player.popup(text);
		},

		afterCardSettled(callback) {
			const currentCard = trigger && trigger.card;
			if (!currentCard) {
				console.error("[DSL] afterCardSettled 拿不到当前 card，无法注册");
				return;
			}
			const tempSkillName = "_dsl_settled_" + skillName + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
			const cleanup = () => {
				player.removeSkill(tempSkillName);
				delete lib.skill[tempSkillName];
				delete lib.translate[tempSkillName];
				delete lib.translate[tempSkillName + "_info"];
			};
			lib.skill[tempSkillName] = {
				trigger: { player: "useCardAfter" },
				filter(event, triggerPlayer) {
					const tc = trigger.card;
					if (!tc || !currentCard) return false;
					const isMatch = tc === currentCard || (tc.cardid && currentCard.cardid && tc.cardid === currentCard.cardid);
					if (!isMatch) {
						cleanup();
						return false;
					}
					return true;
				},
				async content(event, trigger, triggerPlayer) {
					cleanup();
					try {
						await callback();
					} catch (e) {
						console.error(`[DSL] afterCardSettled 回调出错 (技能 ${skillName}):`, e);
					}
				},
				silent: true,
				popup: false,
				audio: 0,
			};
			lib.translate[tempSkillName] = "昂扬";
			lib.translate[tempSkillName + "_info"] = "昂扬的后续效果";
			player.addTempSkill(tempSkillName, "phaseAfter");
		},
	};

	return ctx;
}

function translateTrigger(dsl) {
	if (dsl.trigger) {
		const mapped = EVENT_MAP[dsl.trigger];
		if (!mapped) {
			console.error(`[DSL] 未知事件名: ${dsl.trigger}，请检查 EVENT_MAP`);
			return null;
		}
		return { trigger: mapped, handlers: [{ filter: dsl.filter, run: dsl.run, dslName: dsl.trigger }] };
	}

	if (dsl.on) {
		const handlers = [];
		let mergedTrigger = null;
		for (const eventName in dsl.on) {
			const mapped = EVENT_MAP[eventName];
			if (!mapped) {
				console.error(`[DSL] 未知事件名: ${eventName}，请检查 EVENT_MAP`);
				continue;
			}
			if (!mergedTrigger) mergedTrigger = {};
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

export function defineSkill(name, dsl) {
	const translated = translateTrigger(dsl);
	if (!translated) return;

	const { trigger, handlers } = translated;

	const skill = {
		trigger: trigger,

		// ===== 新增：顶层 filter，无名杀弹窗前会调用 =====
		filter(event, player) {
			const ctx = createContext(event, event, player, name);
			const eventName = event && event.name;
			for (const h of handlers) {
				const mapped = EVENT_MAP[h.dslName];
				if (!mapped) continue;
				let matched = false;
				for (const key in mapped) {
					if (mapped[key] === eventName) { matched = true; break; }
				}
				if (!matched) continue;
				if (h.filter) {
					try {
						return h.filter(ctx);
					} catch (e) {
						console.error(`[DSL] 技能 ${name} 的事件 "${h.dslName}" 的 filter 出错:`, e);
						return false;
					}
				}
				return true;
			}
			return false;
		},

		forced: dsl.forced || false,
		popup: dsl.popup !== undefined ? dsl.popup : true,
		audio: dsl.audio || 2,
		logTarget: dsl.logTarget,
		_priority: dsl.priority || 0,

		async content(event, trigger, player) {
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

			const triggerName = trigger.name;
			let matched = null;
			for (const h of handlers) {
				const mapped = EVENT_MAP[h.dslName];
				if (!mapped) continue;
				for (const key in mapped) {
					if (mapped[key] === triggerName) {
						matched = h;
						break;
					}
				}
				if (matched) break;
			}

			if (!matched) matched = handlers[0];

			const ctx = createContext(event, trigger, player, name);

			if (matched.run) {
				try {
					await matched.run(ctx);
				} catch (e) {
					console.error(`[DSL] 技能 ${name} 的事件 "${matched.dslName}" 的 run 出错:`, e);
				}
			}
		},

		onremove(player) {
			for (const k in player.storage) {
				if (k.startsWith(name + "_")) {
					delete player.storage[k];
				}
			}
		},
	};

	lib.skill[name] = skill;

	return skill;
}

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
