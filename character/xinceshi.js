import { lib, game, ui, get, ai, _status } from "../noname.js";
import { defineSkill } from "./dsl.js";

game.import("character", function () {
	// ===== anyang：出杀摸一张牌 =====
	defineSkill("anyang", {
		trigger: "shaTargeted",
		filter: (ctx) => {
			const card = ctx.card;
			console.warn("[anyang-filter] 被调用，card.name =", card && card.name, "，trigger.name =", ctx.trigger && ctx.trigger.name);
			if (!card) return false;
			if (card.name !== "sha") return false;
			const eventName = ctx.trigger && ctx.trigger.name;
			if (eventName === "useCardToPlayered") {
				if (!ctx.target) return false;
				return true;
			}
			return false;
		},
		async run(ctx) {
			console.warn("[anyang] 触发，准备摸牌");
			await ctx.draw(1);
			ctx.popup("安扬");
			console.warn("[anyang] 摸牌完成");
		},
	});

	return {
		name: "xinceshi",
		characterSort: {
			xinceshi: {
				xinceshi: ["xin_general"],
			},
		},
		character: {
			xin_general: ["male", "qun", 4, ["anyang"]],
		},
		skill: {
		},
		translate: {
			xinceshi: "新测试包",
			xin_general: "新测试武将",
			anyang: "安扬",
			anyang_info: "当你使用【杀】指定一名其他角色为目标后，你摸一张牌。",
		},
	};
});
