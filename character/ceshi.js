// character/my_general.js

lib.character.my_general = {
    name: "测试武将",
    sex: "male",
    hp: 4,
    group: "qun",
    skills: ["my_skill"],
};

lib.skill.my_skill = {
    // 出牌阶段，使用【杀】时触发
    trigger: {
        player: "useCardToPlayered",
    },
    filter(event, player) {
        // 只对【杀】生效
        return event.card && event.card.name === "sha";
    },
    check(event, player) {
        return true;
    },
    logTarget: "target",
    content: function () {
        // 关键：把目标加入 directHit，实现“真无视防具”
        trigger.getParent().directHit.add(trigger.target);
    },
    // 被杀抵消后摸牌
    shaMiss: true,
    onremove: true,
    group: ["my_skill_draw"],
};

lib.skill.my_skill_draw = {
    trigger: {
        player: "shaMiss",
    },
    filter(event, player) {
        // 只处理本技能关联的杀
        return event.getParent().skill === "my_skill";
    },
    content: function () {
        player.draw();
    },
};
