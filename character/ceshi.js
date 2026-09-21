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
			return true;
		},
		async run(ctx) {
			const target = ctx.target;
			if (!target || target.countCards("h") === 0) return;

			// 先拿牌
			await ctx.gainCard(target, "h", 1);
			ctx.popup("昂扬");
			console.warn("[昂扬] 拿完牌，准备注册 afterCardSettled，当前 card name =", ctx.card && ctx.card.name);

			// 记住这次用的牌名和目标
			const usedCardName = ctx.card.name;
			const settledTarget = target;

			// 注册：这张牌结算完后，虚拟出另一张牌
			ctx.afterCardSettled(async () => {
				console.warn("[昂扬] afterCardSettled 触发，usedCardName =", usedCardName);
				if (!settledTarget.isIn() || settledTarget.countCards("h") === 0) {
					console.warn("[昂扬] 对方无手牌，停止");
					return;
				}
				const virtualName = usedCardName === "sha" ? "juedou" : "sha";
				console.warn("[昂扬] 准备 useVirtual", virtualName);
				await ctx.useVirtual(virtualName, settledTarget);
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
