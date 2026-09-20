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
    // 找出「对方」：你用牌时是目标，你被指定时是使用者
    const target = player === trigger.player ? trigger.target : trigger.player;
    
    // 检查对方有没有手牌
    if (target.countCards("h") === 0) {
        game.log(player, "昂扬：对方没有手牌，无法发动");
        return;
    }
    
    // 获得对方 1 张手牌
    await player.gainPlayerCard(target, "h", true);
    player.popup("昂扬");
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
