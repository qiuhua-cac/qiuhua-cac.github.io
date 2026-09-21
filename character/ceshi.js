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

	return {
		name: "ceshi",
		characterSort: {
			ceshi: {
				ceshi: ["my_general"],
			},
		},
		character: {
			my_general: ["male", "qun", 4, ["angyang"]],
		},
		skill: {
		},
		translate: {
			ceshi: "我的武将包",
			my_general: "测试武将",
			angyang: "昂扬",
			angyang_info: "当你使用【杀】或【决斗】仅指定一名其他角色为目标后，或成为其他角色使用这些牌的目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
		},
	};
});
