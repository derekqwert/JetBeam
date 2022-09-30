const GoodKarma = require("../../../shared/card/GoodKarma.js");
const ToxicGas = require("../../../shared/card/ToxicGas.js");
const Drone = require("../../../shared/card/Drone.js");
const DroneLeader = require("../../../shared/card/DroneLeader.js");
const RepairShip = require("../../../shared/card/RepairShip.js");
const DisturbingSignals = require("../../../shared/card/DisturbingSignals.js");
const ExtraDraw = require("../../../shared/card/ExtraDraw.js");
const Revive = require("../../../shared/card/Revive.js");
const Sacrifice = require("../../../shared/card/Sacrifice.js");
const DestroyDuration = require("../../../shared/card/DestroyDuration");
const TheParalyzer = require("../../../shared/card/TheParalyzer");

module.exports = PlayerCardCapability;

const PlayableTypes = ["spaceShip", "defense", "missile"];

const PlayableCards = [
  GoodKarma.CommonId,
  ExtraDraw.CommonId,
  ToxicGas.CommonId,
  DisturbingSignals.CommonId,
  Revive.CommonId,
  Sacrifice.CommonId,
  DestroyDuration.CommonId,
];
const PriorityCards = [
  ToxicGas.CommonId,
  Sacrifice.CommonId,
  Drone.CommonId,
  DroneLeader.CommonId,
  RepairShip.CommonId,
];

function PlayerCardCapability({
  playerStateService,
  matchController,
  playableTypes = PlayableTypes,
  playableCards = PlayableCards,
  priorityCards = PriorityCards,
  cardPlayers,
  cardRules,
}) {
  return {
    canDoIt,
    doIt,
  };

  function canDoIt() {
    const playableCards = playableCardsOnHandAndInStation();
    return playableCards.length > 0;
  }

  function doIt() {
    let playableCards = playableCardsOnHandAndInStation().sort(CheapestFirst());
    /**
     *  TODO: find a better way to do this like having order for bots attribute or soemthing atm thsi will work since just 1 card
     */
    if (playableCards.length >= 2) {
      playableCards = playableCards.filter(
        (cardPlayable) => cardPlayable.commonId !== TheParalyzer.CommonId
      );
    }

    const priorityCard = playableCards.find((card) =>
      priorityCards.includes(card.commonId)
    );

    const card = priorityCard || playableCards[0];
    playCard(card);
  }

  function playableCardsOnHandAndInStation() {
    return playerStateService.getMatchingPlayableBehaviourCards(canPlayCard);
  }

  function CheapestFirst() {
    return (a, b) => a.costToPlay - b.costToPlay;
  }

  function playCard(card) {
    const hasSpecificPlayer = cardPlayers.find((player) =>
      player.forCard(card)
    );
    if (hasSpecificPlayer) {
      hasSpecificPlayer.play(card);
    } else {
      matchController.emit("putDownCard", {
        cardId: card.id,
        location: "zone",
      });
    }
  }

  function canPlayCard(card) {
    return (
      canPlayCardTypeOrSpecificCard(card) &&
      cardRules.every((rule) => rule(card))
    );
  }

  function canPlayCardTypeOrSpecificCard(card) {
    return (
      playableTypes.includes(card.type) ||
      playableCards.includes(card.commonId) ||
      cardPlayers.some((player) => player.forCard(card))
    );
  }
}
