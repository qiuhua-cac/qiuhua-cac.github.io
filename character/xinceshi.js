import { lib, game, ui, get, ai, _status } from "../noname.js";
import { defineSkill } from "./dsl.js";

game.import("character", function () {
	// ===== 昂扬（单技能版） =====
	defineSkill("angyang", {
		trigger: "shaTargeted",
		filter: (ctx) => {
			const card = ctx.card;
			if (!card) return false;
			if (card.name !== "sha" && card.name !== "juedou") return false;
			// 用 ctx.trigger.name 判断视角（trigger 才一定有 name）
			const eventName = ctx.trigger && ctx.trigger.name;
			console.warn("[昂扬-filter] 视角 =", eventName);
			if (eventName === "useCardToPlayered") {
				if (!ctx.target) return false;
				return true;
			}
			if (eventName === "useCardToTargeted") {
				if (!ctx.source) return false;
				return true;
			}
			return false;
		},
		async run(ctx) {
			const eventName = ctx.trigger && ctx.trigger.name;
			let opponent = null;
			let usedCardName = null;

			if (eventName === "useCardToPlayered") {
				opponent = ctx.target;
				usedCardName = ctx.card.name;
			} else if (eventName === "useCardToTargeted") {
				opponent = ctx.source;
				usedCardName = ctx.card.name;
			} else {
				console.warn("[昂扬] 视角不匹配，return。eventName =", eventName);
				return;
			}

			if (!opponent || !opponent.isIn() || opponent.countCards("h") === 0) {
				console.warn("[昂扬] 对方无手牌，不触发");
				return;
			}

			console.warn("[昂扬] 触发，视角 =", eventName, "，对方 =", opponent.name, "，牌名 =", usedCardName);

			await ctx.gainCard(opponent, "h", 1);
			ctx.popup("昂扬");

			ctx.afterCardSettled(async () => {
				console.warn("[昂扬] afterCardSettled 触发，usedCardName =", usedCardName);
				if (!opponent.isIn() || opponent.countCards("h") === 0) {
					console.warn("[昂扬] 对方无手牌，停止");
					return;
				}
				const virtualName = usedCardName === "sha" ? "juedou" : "sha";
				console.warn("[昂扬] 准备 useVirtual", virtualName);
				await ctx.useVirtual(virtualName, opponent);
				console.warn("[昂扬] useVirtual 完成");
			});
		},
	});
	// ===== 傀术（第一阶段） =====
	defineSkill("kuishu", {
		trigger: "turnStart",
		filter: () => true,
		async run(ctx) {
			console.warn("[傀术] 回合开始触发");

			const want = await ctx.chooseControl("发动", "不发动");
			console.warn("[傀术] 玩家选择：", want);
			if (want !== "发动") return;

			ctx.popup("傀术");

			const generals = ctx.randomGenerals(2);
			console.warn("[傀术] 抽到武将：", generals.map(g => g.name));
			if (generals.length < 2) {
				console.warn("[傀术] 候选不足 2 个，跳过");
				return;
			}

			const picked = [];
			for (let i = 0; i < generals.length; i++) {
				const g = generals[i];
				const list = g.skills.map(skillName => {
					const skillDesc = (lib.translate[skillName + "_info"]) || "";
					return [g.name, skillDesc.slice(0, 30), skillName];
				});
				const links = await ctx.chooseButtonFromList(
					"从【" + g.name + "】的技能里选 1 个",
					list,
					false
				);
				if (links && links[0]) {
					picked.push(links[0][2]);
					console.warn("[傀术] 从 " + g.name + " 选了：" + links[0][2]);
				}
			}

			if (picked.length === 0) {
				console.warn("[傀术] 没选到任何技能");
				return;
			}

			const pool = ctx.storage.get("pool") || [];
			for (const s of picked) {
				if (!pool.includes(s)) pool.push(s);
			}
			ctx.storage.set("pool", pool);
			console.warn("[傀术] 当前技能池：", pool);

			const poolList = pool.map(skillName => {
				const desc = (lib.translate[skillName + "_info"]) || "";
				return ["技能池", desc.slice(0, 30), skillName];
			});
			const activeLinks = await ctx.chooseButtonFromList(
				"从技能池里选 2 个激活",
				poolList,
				true
			);
			const active = (activeLinks || []).map(l => l[2]);
			console.warn("[傀术] 激活：", active);

			for (const s of pool) {
				ctx.addSkill(s);
			}
			for (const s of pool) {
				if (active.includes(s)) {
					ctx.enableSkill(s);
				} else {
					ctx.disableSkill(s);
				}
			}
			console.warn("[傀术] 技能激活状态设置完成");
		},
	});

	return {
		name: "ceshi",
		characterSort: {
			ceshi: {
				ceshi: ["my_general"],
			},
		},
		character: {
			my_general: ["male", "qun", 4, ["angyang", "kuishu"]],
		},
		skill: {
		},
		translate: {
			xinceshi: "我的武将包",
			my_general: "测试武将",
			angyang: "昂扬",
			angyang_info: "当你使用【杀】或【决斗】仅指定一名其他角色为目标后，或成为其他角色使用这些牌的目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
			kuishu: "傀术",
			kuishu_info: "你的回合开始时，你可以获得未上场的随机2名武将由你指定的1个技能，直到你的下个回合开始时。",
		},
	};
});
