import { lib, game, ui, get, ai, _status } from "../noname.js";
import { defineSkill } from "./dsl.js";

game.import("character", function () {
	// ===== 昂扬（最小版：只拿牌，不循环） =====
	defineSkill("angyang", {
		trigger: "shaTargeted",
		filter: (ctx) => {
    const card = ctx.card;
    const name1 = card && card.name;
    console.warn("[昂扬-filter] 第一次取 name =", name1);
    if (!card) return false;
    if (card.name !== "sha" && card.name !== "juedou") {
        console.warn("[昂扬-filter] 第二次取 name =", card.name, "，即将 return false");
        return false;
    }
    console.warn("[昂扬-filter] 通过！name =", card.name);
    const eventName = ctx.trigger && ctx.trigger.name;
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
			if (eventName === "useCardToPlayered") {
				opponent = ctx.target;
			} else if (eventName === "useCardToTargeted") {
				opponent = ctx.source;
			} else {
				console.warn("[昂扬] 视角不匹配，return。eventName =", eventName);
				return;
			}
			if (!opponent || !opponent.isIn() || opponent.countCards("h") === 0) {
				console.warn("[昂扬] 对方无手牌，不触发");
				return;
			}
			console.warn("[昂扬] 触发，视角 =", eventName, "，对方 =", opponent.name, "，牌名 =", ctx.card.name);
			await ctx.gainCard(opponent, "h", 1);
			ctx.popup("昂扬");
			console.warn("[昂扬] 拿牌完成");
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
			angyang_info: "当你使用【杀测试】或【决斗测试】仅指定一名其他角色为目标后，或成为其他角色使用这些牌的目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
		},
	};
});
