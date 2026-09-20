import { lib, game, ui, get, ai, _status } from "../noname.js";
import { defineSkill } from "./dsl.js";

game.import("character", function () {
	// 注册昂扬的 DSL 技能
	defineSkill("angyang", {
		trigger: "shaTargeted",
		filter: (ctx) => {
			// 只对杀和决斗生效
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
			ctx.addTempSkill("angyang_after", "phaseAfter");
		},
	});

	defineSkill("angyang_after", {
		trigger: "cardUsed",
		filter: (ctx) => {
			return ctx.storage.get("card") === ctx.card;
		},
		async run(ctx) {
			const target = ctx.storage.get("target");
			const card = ctx.storage.get("card");
			ctx.storage.clear();
			if (!target || target.countCards("h") === 0) return;
			const virtualName = card.name === "sha" ? "juedou" : "sha";
			await ctx.useVirtual(virtualName, target);
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
			// 技能已经通过 defineSkill 注册到 lib.skill
			// 这里不用再写
		},
		translate: {
			ceshi: "我的武将包",
			my_general: "测试武将",
			angyang: "昂扬",
			angyang_info: "当你使用【杀】或【决斗】仅指定一名其他角色为目标后，或成为其他角色使用这些牌的目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
			angyang_after: "昂扬",
			angyang_after_info: "昂扬的后续效果",
		},
	};
});
