const MatchMode = require("../../shared/match/MatchMode.js");
const Commander = require("../../shared/match/commander/Commander.js");

module.exports = function ({
  matchService,
  playerStateService,
  queryPlayerRequirements,
  playerRuleService,
  playerPhase,
  playerCommanders,
  turnControl,
  opponentStateService,
  drawPhaseDecider,
  preparationPhaseDecider,
  actionPhaseDecider,
  discardPhaseDecider,
  decideCardToDiscard,
  decideCardToSacrifice,
  attackPhaseDecider,
  matchController,
  requirementsPlayer: requirementsPlayerInOrder = [], //WARNING: this should follow the same pattern as cardPlayer
}) {
  if (queryPlayerRequirements.isWaitingOnOpponentFinishingRequirement()) return;
  if (hasAnyRequirements()) {
    performRequirement();
    return;
  }

  if (matchService.isGameOn() && turnControl.opponentHasControl()) return;

  if (isChoosingStartingPlayer()) {
    choosingStartingPlayer();
  } else if (isSelectingStartingStationCards()) {
    selectingStartingStationCards();
  } else {
    if (playerPhase.isDraw()) {
      drawPhaseDecider.decide();
    } else if (playerPhase.isPreparation()) {
      preparationPhaseDecider.decide();
    } else if (playerPhase.isAction()) {
      actionPhaseDecider.decide();
    } else if (playerPhase.isDiscard()) {
      discardPhaseDecider.decide();
    } else if (playerPhase.isAttack()) {
      attackPhaseDecider.decide();
    }
  }

  function isChoosingStartingPlayer() {
    return (
      matchService.mode() === MatchMode.chooseStartingPlayer &&
      matchService.getCurrentPlayer() === playerStateService.getPlayerId()
    );
  }

  function isSelectingStartingStationCards() {
    return matchService.mode() === MatchMode.selectStationCards;
  }

  function selectingStartingStationCards() {
    const canPutDownMoreStationCards = playerRuleService.canPutDownMoreStartingStationCards();
    if (canPutDownMoreStationCards) {
      const cardsOnHand = playerStateService.getCardsOnHand();
      const location = locationForStartingStationCard();
      matchController.emit("selectStartingStationCard", {
        cardId: cardsOnHand[0].id,
        location,
      });
    } else if (!playerCommanders.hasSelectedSomeCommander()) {
      let commander = Commander.FrankJohnson;

      if (playerStateService.getPlayerState().currentDeck === "TheSwarm") {
        const swarmCommander = [Commander.Crakux, Commander.Zuuls];
        commander = swarmCommander[Math.floor(Math.random() * 2)];
      }

      matchController.emit("selectCommander", {
        commander: commander,
      });
    } else if (!playerStateService.isReadyForGame()) {
      matchController.emit("playerReady");
    }
  }

  function locationForStartingStationCard() {
    const cardsSelected = playerRuleService.amountOfStartingStationCardsSelected();
    if (cardsSelected === 0) {
      return "draw";
    } else if (cardsSelected === 1) {
      return "action";
    } else if (cardsSelected === 2) {
      return "handSize";
    } else {
      return "action";
    }
  }

  function choosingStartingPlayer() {
    matchController.emit("selectPlayerToStart", {
      playerToStartId: playerStateService.getPlayerId(),
    });
  }

  function damageOpponentStationCards() {
    const targetIds = opponentStateService
      .getUnflippedStationCards()
      .slice(0, getDamageStationCardRequirementCount())
      .map((c) => c.id);
    matchController.emit("damageStationCards", { targetIds });
  }

  function hasRequirementOfType(type) {
    return !!getRequirementOfType(type);
  }

  function getDamageStationCardRequirementCount() {
    return getRequirementOfType("damageStationCard").count;
  }

  function getRequirementOfType(type) {
    return queryPlayerRequirements.getFirstMatchingRequirement({ type });
  }

  function hasAnyRequirements() {
    return queryPlayerRequirements.hasAnyRequirements();
  }

  function performRequirement() {
    if (hasRequirementOfType("drawCard")) {
      matchController.emit("drawCard");
    } else if (hasRequirementOfType("discardCard")) {
      matchController.emit("discardCard", decideCardToDiscard());
    } else if (hasRequirementOfType("damageStationCard")) {
      damageOpponentStationCards();
    } else if (hasRequirementOfType("sacrifice")) {
      matchController.emit(
        "sacrificeCardForRequirement",
        decideCardToSacrifice()
      );
    } else if (hasRequirementOfType("findCard")) {
      const findRequirement = getRequirementOfType("findCard");
      for (const player of requirementsPlayerInOrder) {
        if (player.canResolve(findRequirement)) {
          player.resolve(findRequirement);
          break;
        }
      }
    } else if (hasRequirementOfType("damageShieldCard")) {
      const damageShieldCardRequirement = getRequirementOfType(
        "damageShieldCard"
      );
      matchController.emit("damageShieldCards", {
        targetIds: getTargetShields(damageShieldCardRequirement),
      });
    }
  }

  function getTargetShields(damageShieldCardRequirement) {
    const opponentShields = opponentStateService
      .getMatchingBehaviourCards((card) => card.stopsStationAttack())
      .slice(0, damageShieldCardRequirement.count);

    return opponentShields.map((card) => card.id);
  }
};
