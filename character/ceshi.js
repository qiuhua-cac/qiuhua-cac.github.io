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
			angyang: {
    trigger: {
        player: "useCardToPlayered",
        target: "useCardToTargeted",
    },
    filter(event, player) {
        // 只对【杀】和【决斗】生效
        if (event.card.name !== "sha" && event.card.name !== "juedou") return false;
        // 只处理「仅指定1名其他角色」的情况
        if (event.card.name === "sha") {
            // 杀只有一个目标的情况
            if (event.targets && event.targets.length !== 1) return false;
        }
        return true;
    },
    logTarget(event, player) {
        // 对方是谁
        return player === event.player ? event.target : event.player;
    },
    async content(event, trigger, player) {
    const target = player === trigger.player ? trigger.target : trigger.player;
    if (target.countCards("h") === 0) return;
    await player.gainPlayerCard(target, "h", true);
    player.popup("昂扬");
    
    // 用 storage 存：对方是谁 + 当前牌名
    player.storage.angyang_target = target;
    player.storage.angyang_cardname = trigger.card.name;
    // 临时获得辅助技能，用来监听 useCardAfter
    player.addTempSkill("angyang_after", "phaseAfter");
},
},
angyang_after: {
    trigger: { player: "useCardAfter" },
    forced: true,
    popup: false,
    filter(event, player) {
        // 必须有昂扬留下的 storage
        return player.storage.angyang_target && player.storage.angyang_target.isIn();
    },
    async content(event, trigger, player) {
        const target = player.storage.angyang_target;
        const cardname = player.storage.angyang_cardname;
        // 清掉状态，避免重复触发
        delete player.storage.angyang_target;
        delete player.storage.angyang_cardname;
        // 对方没手牌就不触发
        if (target.countCards("h") === 0) return;
        // 决定虚拟牌
        const virtualName = cardname === "sha" ? "juedou" : "sha";
        // 视为使用
        await player.useCard({ name: virtualName, isCard: true }, target);
    },
},
		},
		translate: {
			ceshi: "我的武将包",
			my_general: "测试武将",
			my_skill: "测试技",
			my_skill_info: "出牌阶段，你使用【杀】无视目标防具。若此【杀】被【闪】抵消，你摸一张牌。",
			angyang: "昂扬",
			angyang_info: "当你使用【杀】或【决斗】仅指定一名其他角色为目标后，或成为其他角色使用这些牌的目标后，你可以获得其一张手牌。若如此做，正在使用的牌结算后，若其有手牌，你视为对其使用另一种牌。",
		},
	};
});
