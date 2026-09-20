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
			my_general: ["male", "qun", 4, ["angyang"]],
		},
		skill: {
			angyang: {
				trigger: {
					player: "useCardToPlayered",
					target: "useCardToTargeted",
				},
				filter(event, player) {
					if (event.card.name !== "sha" && event.card.name !== "juedou") return false;
					if (event.card.name === "sha") {
						if (event.targets && event.targets.length !== 1) return false;
					}
					return true;
				},
				logTarget(event, player) {
					return player === event.player ? event.target : event.player;
				},
				async content(event, trigger, player) {
					const target = player === trigger.player ? trigger.target : trigger.player;
					if (target.countCards("h") === 0) return;
					await player.gainPlayerCard(target, "h", true);
					player.popup("昂扬");
					player.storage.angyang_target = target;
					player.storage.angyang_cardname = trigger.card.name;
					player.addTempSkill("angyang_after", "phaseAfter");
				},
			},
			angyang_after: {
				trigger: { player: "useCardAfter" },
				forced: true,
				popup: false,
				filter(event, player) {
					return player.storage.angyang_target && player.storage.angyang_target.isIn();
				},
				async content(event, trigger, player) {
					const target = player.storage.angyang_target;
					const cardname = player.storage.angyang_cardname;
					delete player.storage.angyang_target;
					delete player.storage.angyang_cardname;
					if (target.countCards("h") === 0) return;
					const virtualName = cardname === "sha" ? "juedou" : "sha";
					await player.useCard({ name: virtualName, isCard: true }, target);
				},
			},
		},
		translate: {
			ceshi: "我的武将包",
			my_general: "测试武将",
			angyang: "昂扬",
			angyang_info: "当你使用【杀】或【决斗】仅指定一名其他角色为目标后，或成为其他角色使用这些牌的目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
		},
	};
});
