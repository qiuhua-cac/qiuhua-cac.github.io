import { lib, game, ui, get, ai, _status } from "../noname.js";
import { defineSkill } from "./dsl.js";

game.import("character", function () {
	// ===== 昂扬主技能 =====
	defineSkill("angyang", {
		trigger: "shaTargeted",
		filter: (ctx) => {
			const card = ctx.card;
			if (!card) return false;
			if (card.name !== "sha" && card.name !== "juedou") return false;
			return true;
		},
		async run(ctx) {
			const target = ctx.target;
			if (!target || target.countCards("h") === 0) return;
			await ctx.gainCard(target, "h", 1);
			ctx.popup("昂扬");
			ctx.storage.set("target", target);
			ctx.storage.set("card", ctx.card);
			console.warn("[昂扬探针] 存进去的 card name =", ctx.card && ctx.card.name);
			ctx.addTempSkill("angyang_after", "phaseAfter");
		},
	});

	// ===== 昂扬后续技能（诊断版：filter 恒 true） =====
	defineSkill("angyang_after", {
		trigger: "cardUsed",
		filter: (ctx) => {
			console.warn(
				"[昂扬探针-filter] 被调用，ctx.card =",
				ctx.card,
				"，ctx.card.name =",
				ctx.card && ctx.card.name,
				"，ctx.event =",
				ctx.event && ctx.event.name
			);
			return true; // 诊断用：恒 true
		},
		async run(ctx) {
			console.warn("====== 昂扬探针-after: run 开始 ======");
			const target = ctx.storage.get("target");
			const card = ctx.storage.get("card");
			console.warn("昂扬探针-after target =", target);
			console.warn("昂扬探针-after card =", card);
			ctx.storage.clear();
			if (!target || target.countCards("h") === 0) {
				console.warn("昂扬探针-after: target 无手牌，return");
				return;
			}
			const virtualName = card.name === "sha" ? "juedou" : "sha";
			console.warn("昂扬探针-after: 准备 useVirtual", virtualName);
			await ctx.useVirtual(virtualName, target);
			console.warn("====== 昂扬探针-after: useVirtual 完成 ======");
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
			angyang_info: "当你使用【杀】或【决斗】仅指定一名其他角色为目标后，或成为其他角色使用这些牌为目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
			angyang_after: "昂扬",
			angyang_after_info: "昂扬的后续效果",
		},
	};
});
