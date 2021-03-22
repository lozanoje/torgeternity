import { torgeternity } from "./module/config.js";
import * as Chat from "./module/chat.js";
import torgeternityItem from "./module/torgeternityItem.js";
import torgeternityActor from "./module/torgeternityActor.js";
import torgeternityItemSheet from "./module/sheets/torgeternityItemSheet.js";
import torgeternityActorSheet from "./module/sheets/torgeternityActorSheet.js";
import { sheetResize } from "./module/sheetResize.js";
import { preloadTemplates } from "./module/preloadTemplates.js";
import { toggleViewMode } from "./module/viewMode.js";

import torgeternityCombat from "./module/dramaticScene/torgeternityCombat.js";
import torgeternityCombatTracker from "./module/dramaticScene/torgeternityCombatTracker.js";
import { alphabSort } from "./module/AlphabeticalSort.js";

Hooks.once("init", async function () {
  console.log("torgeternity | Initializing Torg Eternity System");

  //-------global
  game.torgeternity = {
    rollItemMacro,
  };

  CONFIG.torgeternity = torgeternity;
  CONFIG.Item.entityClass = torgeternityItem;
  CONFIG.Actor.entityClass = torgeternityActor;
  CONFIG.statusEffects = torgeternity.statusEffects;

  //--------combats
  CONFIG.Combat.initiative.formula = "1";
  CONFIG.Combat.entityClass = torgeternityCombat;
  CONFIG.ui.combat = torgeternityCombatTracker;

  //---register items and actors
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("torgeternity", torgeternityItemSheet, {
    makeDefault: true,
  });

  Actors.unregisterSheet("core", ItemSheet);
  Actors.registerSheet("torgeternity", torgeternityActorSheet, {
    makeDefault: true,
  });

  //----------preloading handlebars templates
  preloadTemplates();

  //----------debug hooks
  CONFIG.debug.hooks = true;
  /*
  //----socket receiver
  game.socket.on("system.torgeternity", (data) => {
    if (data.msg == "cardPlayed") {
      Cards.cardPlayed(data);
    }
    if (data.msg == "cardReserved") {
      Cards.cardReserved(data);
    }
    if (data.msg == "cardExchangePropose") {
      Cards.cardExchangePropose(data);
    }
    if (data.msg == "cardExchangeValide") {
      Cards.cardExchangeValide(data);
    }
  });
*/
});

//-------------once everything ready
Hooks.on("ready", function () {
  sheetResize();
  toggleViewMode();
  var logo = document.getElementById("logo");
  logo.style.position = "absolute";
  logo.setAttribute("src", "/systems/torgeternity/images/vttLogo.webp");

  Hooks.on("hotbarDrop", (bar, data, slot) =>
    createTorgEternityMacro(data, slot)
  );
  /*

  //-----applying players card ui:
  if (game.user.data.role == false || game.user.data.role != 4) {
    let user=game.users.get(game.user._id)
    
    ui.HandedCards = new HandedCardsApp();
    ui.HandedCards.render(true);
  };
  //-----applying GM card ui:
  if (game.user.data.role == 4 || game.user.data.role == 3) {
    //init cards GM Decks
    let user=game.users.get(game.user._id)
   
    ui.GMDecks = new GMDecksApp();
    ui.GMDecks.render(true);
  };

*/
});
/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createTorgEternityMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data))
    return ui.notifications.warn(
      "You can only create macro buttons for owned Items"
    );
  const item = data.data;
  console.log(item);

  // Create the macro command
  const command = `game.torgeternity.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "torgeternity.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find((i) => i.name === itemName) : null;
  if (!item)
    return ui.notifications.warn(
      `Your controlled Actor does not have an item named ${itemName}`
    );

  // Trigger the item roll
  switch (item.data.type) {
    case "customAttack":
    case "meleeweapon":
    case "missileweapon":
    case "firearm":
    case "heavyweapon":
      return item.weaponAttack();
      break;
    case "psionicpower":
    case "miracle":
    case "spell":
      return item.power();
      break;

    default:
      return item.roll();
  }
}

//----all this could be draft in another imported module ?? maybe like ./modules/handlebarsHelpers.js

Handlebars.registerHelper("concatSkillValue", function (skillName) {
  var skillValue = "{{data.skills." + skillName + ".value}}";
  return skillValue;
});

Handlebars.registerHelper("concatAttributeName", function (attributeName) {
  var localName = "torgeternity.attributes." + attributeName;
  return localName;
});

Handlebars.registerHelper("concatSkillName", function (skillName) {
  var localName = "torgeternity.skills." + skillName;
  return localName;
});

Handlebars.registerHelper("concatClearanceLevel", function (clearance) {
  var localClearance = "torgeternity.clearances." + clearance;
  return localClearance;
});

Handlebars.registerHelper("concatSpecialAbility", function (description) {
  // Removes <p> and </p> from the beginning and end of special ability descriptions so that they appear inline on threat sheet
  if (description.startsWith("<p>")) {
    var updatedDescription;
    var endPoint = description.length;
    updatedDescription = description.substr(3, endPoint);
    return updatedDescription;
  } else {
    return description;
  }
});

Hooks.on("renderChatLog", (app, html, data) => Chat.addChatListeners(html));
Hooks.on("renderActorSheet", (app, html, data) => alphabSort(html, data));
