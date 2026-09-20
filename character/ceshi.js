import { lib, game, ui, get, ai, _status } from "../noname.js";

game.import("character", function () {
	return {
		name: "ceshi",
		characterSort: {
			ceshi: {
				ceshi: ["my_general"],
			},
		},
		character: {
			my_general: ["male", "qun", 4, ["my_skill"]],
		},
		skill: {
			my_skill: {
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					return event.card && event.card.name === "sha";
				},
				forced: true,
				logTarget: "target",
				async content(event, trigger, player) {
					trigger.getParent().directHit.add(trigger.target);
				},
				group: ["my_skill_draw"],
			},
			my_skill_draw: {
				trigger: { player: "shaMiss" },
				forced: true,
				async content(event, trigger, player) {
					player.draw();
				},
			},
		},
		translate: {
			ceshi: "我的武将包",
			my_general: "测试武将",
			my_skill: "测试技",
			my_skill_info: "出牌阶段，你使用【杀】无视目标防具。若此【杀】被【闪】抵消，你摸一张牌。",
		},
	};
});
