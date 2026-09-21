import { lib, game, ui, get, ai, _status } from "../noname.js";
import { defineSkill } from "./dsl.js";

game.import("character", function () {
	// ===== 昂扬（单技能版） =====
	defineSkill("angyang", {
		trigger: "shaTargeted",
		filter: (ctx) => {
			const card = ctx.card;
			if (!card) return false;
			// 只对杀和决斗生效
			if (card.name !== "sha" && card.name !== "juedou") return false;
			// 必须是「你使用的牌」——用事件名判断是主动视角还是被动视角
			// 主动视角事件名：useCardToPlayered（你出牌）
			// 被动视角事件名：useCardToTargeted（别人对你出牌）
			const eventName = ctx.event && ctx.event.name;
			if (eventName === "useCardToPlayered") {
				// 主动视角：你是使用者，需要有目标
				if (!ctx.target) return false;
				return true;
			}
			if (eventName === "useCardToTargeted") {
				// 被动视角：你是目标，需要有使用者
				if (!ctx.source) return false;
				return true;
			}
			// 其他视角不触发
			return false;
		},
		async run(ctx) {
			const eventName = ctx.event && ctx.event.name;
			let opponent = null;
			let usedCardName = null;

			if (eventName === "useCardToPlayered") {
				// 主动：你出牌，对方 = 目标
				opponent = ctx.target;
				usedCardName = ctx.card.name;
			} else if (eventName === "useCardToTargeted") {
				// 被动：别人对你出牌，对方 = 使用者
				opponent = ctx.source;
				usedCardName = ctx.card.name;
			} else {
				return;
			}

			if (!opponent || !opponent.isIn() || opponent.countCards("h") === 0) {
				console.warn("[昂扬] 对方无手牌，不触发");
				return;
			}

			console.warn("[昂扬] 触发，视角 =", eventName, "，对方 =", opponent.name, "，牌名 =", usedCardName);

			// 拿牌
			await ctx.gainCard(opponent, "h", 1);
			ctx.popup("昂扬");

			// 注册：这张牌结算完后，虚拟出另一张牌
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
