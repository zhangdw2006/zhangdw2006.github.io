if(CookieAssistant === undefined)
{
	var CookieAssistant = {};
}
if(typeof CCSE == 'undefined')
{
	Game.LoadMod('https://klattmose.github.io/CookieClicker/SteamMods/CCSE/main.js');
}

CookieAssistant.name = 'Cookie Assistant';
CookieAssistant.version = '0.7.5';
CookieAssistant.GameVersion = '2.052';


CookieAssistant.launch = function()
{
	CookieAssistant.defaultConfig = function()
	{
		var conf = 
		{
			//各機能の有効/無効のフラグ
			flags:
			{
				autoClickBigCookie: 0,
				autoClickGoldenCookie: 0,
				autoClickReindeer: 0,
				autoClickFortuneNews: 0,
				autoClickWrinklers: 0,
				autoSpellonBuff: 0,
				autoBuyElderPledge: 0,
				autoBuyUpgrades: 0,
				autoBuyBuildings: 0,
				autoSwitchSeason: 0,
				autoTrainDragon : 0,
				autoSetSpirits : 0,
				autoHarvestSugarlump : 0,
				autoSellBuilding : 0,
				autoToggleGoldenSwitch : 0,
				autoChocolateEgg : 0,
				autoHireBrokers : 0,
			},
			//各機能の実行間隔
			intervals:
			{
				autoClickBigCookie: 1,
				autoClickGoldenCookie: 1,
				autoClickReindeer: 100,
				autoClickFortuneNews: 100,
				autoClickWrinklers: 60000,
				autoSpellonBuff: 1000,
				autoBuyElderPledge: 1000,
				autoBuyUpgrades: 1000,
				autoBuyBuildings: 1000,
				autoSwitchSeason: 1000,
				autoTrainDragon : 1000,
				autoSetSpirits : 10000,
				autoHarvestSugarlump : 60000,
				autoSellBuilding : 5000,
				autoToggleGoldenSwitch : 500,
				autoHireBrokers : 1000,
			},
			//各機能の特殊設定　CheckConfigでの限界があるのでこれ以上深くしない
			particular:
			{
				dragon:
				{
					aura1: 0,
					aura2: 0,
				},
				spell:
				{
					mode: 0, //mp condition
					mode2: 0, //buff count condition
				},
				upgrades:
				{
					mode: 0,
				},
				buildings:
				{
					mode: 0,
				},
				spirits:
				{
					slot1: 0,
					slot2: 1,
					slot3: 2,
				},
				golden:
				{
					mode: 0,
				},
				bigCookie:
				{
					isMute: 1,
				},
				sell:
				{
					isAfterSell: [], //売却後かどうかのフラグ保持(作動中にゲームを落としても動作するように)
					target: [],
					amount: [],
					activate_mode: [],
					after_mode: [],
				},
				wrinkler:
				{
					mode: 0,
				},
				bigCookie:
				{
					mode: 0,
				},
				goldenSwitch:
				{
					enable: 0,
					disable: 0,
				},
				season:
				{
					afterComplete: 0, //シーズン全部終わった後どうするか
				},
				system:
				{
					lastVersion: '', //リリースノート通知用に前回起動時のバージョンを保持しておく
				},
			}
		};

		return conf;
	}

	CookieAssistant.init = function()
	{
		CookieAssistant.isLoaded = 1;
		CookieAssistant.restoreDefaultConfig(1);
		CookieAssistant.ReplaceGameMenu();

		//大クッキーのSEミュート
        CCSE.SpliceCodeIntoFunction(
			"Game.playCookieClickSound",
			2,
			"if (CookieAssistant.config.particular.bigCookie.isMute) { return; }"
		);

		//建物売買のSEミュート
		for (const objectName of Object.keys(Game.Objects)) {
			CCSE.ReplaceCodeIntoFunction(
				"Game.Objects['" + objectName + "'].sell",
				"PlaySound('snd/sell'+choose([1,2,3,4])+'.mp3',0.75);",
				"if (!CookieAssistant.config.flags.autoSellBuilding) {PlaySound('snd/sell'+choose([1,2,3,4])+'.mp3',0.75);}",
				0
			);
			CCSE.ReplaceCodeIntoFunction(
				"Game.Objects['" + objectName + "'].buy",
				"PlaySound('snd/buy'+choose([1,2,3,4])+'.mp3',0.75);",
				"if (!CookieAssistant.config.flags.autoSellBuilding) {PlaySound('snd/buy'+choose([1,2,3,4])+'.mp3',0.75);}",
				0
			);
		}
		
		//ChocolateEgg自動購入
		CCSE.SpliceCodeIntoFunction(
			"Game.Ascend",
			5,
			"CookieAssistant.OnPreAscend();"
		);


		CookieAssistant.showAllIntervals = false;
		CookieAssistant.isAfterSpellcast = false;

		CookieAssistant.intervalHandles = 
		{
			autoClickBigCookie: null,
			autoClickGoldenCookie: null,
			autoClickReindeer: null,
			autoClickFortuneNews: null,
			autoClickWrinklers: null,
			autoSpellonBuff: null,
			autoBuyElderPledge: null,
			autoBuyUpgrades: null,
			autoBuyBuildings: null,
			autoSwitchSeason: null,
			autoTrainDragon : null,
			autoSetSpirits : null,
			autoHarvestSugarlump : null,
			autoSellBuilding : null,
			autoToggleGoldenSwitch : null,
		}

		CookieAssistant.modes =
		{
			spell:
			{
				0:
				{
					desc: "满足 MP 所需条件时",
				},
				1:
				{
					desc: "MP 已满时",
				}
			},
			spell_buff:
			{
				0:
				{
					count: 1,
					desc: "有 1 个BUFF",
				},
				1:
				{
					count: 2,
					desc: "有 2 个或以上BUFF",
				}
			},
			upgrades:
			{
				0:
				{
					desc: "所有升级（包含研究）",
				},
				1:
				{
					desc: "所有升级但不包含研究",
				},
				2:
				{
					desc: `所有升级但不会导致奶奶末日的研究`,
				},
			},
			buildings:
			{
				0:
				{
					amount: 10,
					desc: "以 10 个为单位购买",
				},
				1:
				{
					amount: 50,
					desc: "以 50 个为单位购买",
				},
				2:
				{
					amount: 100,
					desc: "以 100 个为单位购买",
				},
			},
			golden:
			{
				0:
				{
					desc: "所有黄金饼干（包含愤怒饼干）",
				},
				1:
				{
					desc: "忽略愤怒饼干",
				}
			},
			sell_buildings: //建物自動売却の発動条件
			{
				0:
				{
					desc: "拥有 1 个BUFF",
				},
				1:
				{
					desc: "拥有 2 个或以上BUFF",
				},
				2:
				{
					desc: "拥有点击类BUFF",
				},
				3:
				{
					desc: "拥有 2 个或以上BUFF且包含点击类BUFF",
				},
				4:
				{
					desc: "自动释放魔法后",
				},
				5:
				{
					desc: "总是",
				},
				6:
				{
					desc: "拥有 3 个或以上BUFF时",
				},
			},
			sell_buildings_after: //建物自動売却を行った後の動作
			{
				0:
				{
					desc: "买回已卖出的数量",
				},
				1:
				{
					desc: "如果可以施法则施法，然后买回已卖出的数量",
				},
				2:
				{
					desc: "什么都不做",
				},
			},
			wrinkler:
			{
				0:
				{
					desc: "所有种类的饼干虫",
				},
				1:
				{
					desc: "排除闪闪发光的饼干虫",
				},
			},
			bigCookie:
			{
				0:
				{
					desc: "总是",
				},
				1:
				{
					desc: "拥有一个点击类BUFF时",
				},
				2:
				{
					desc: "拥有 1 个BUFF时",
				},
				3:
				{
					desc: "拥有 2 个或以上BUFF时",
				}
			},
			goldenSwitch_enable:
			{
				0:
				{
					desc: "拥有 1 个BUFF时",
				},
				1:
				{
					desc: "拥有 2 个或以上BUFF时",
				},
				2:
				{
					desc: "拥有点击类BUFF时",
				},
				3:
				{
					desc: "拥有 2 个或以上BUFF且包含点击类BUFF时",
				},
			},
			goldenSwitch_disable:
			{
				0:
				{
					desc: "无BUFF时",
				},
				1:
				{
					desc: "无点击类BUFF时",
				},
			},
			season:
			{
				0:
				{
					desc: "无季节",
					season: "",
				},
				1:
				{
					desc: "圣诞节",
					season: "christmas",
				},
				2:
				{
					desc: "复活节",
					season: "easter",
				},
				3:
				{
					desc: "万圣节",
					season: "halloween",
				},
				4:
				{
					desc: "情人节",
					season: "valentines",
				},
				5:
				{
					desc: "公司日（愚人节）",
					season: "fools",
				},
			},
		}

		CookieAssistant.actions =
		{
			autoClickBigCookie: () =>
			{
				CookieAssistant.intervalHandles.autoClickBigCookie = setInterval(
					() =>
					{
						//BGMがおかしくなるので最初の1秒は実行しない
						if (Game.T < Game.fps)
						{
							return;
						}
						//転生中は動作を止める
						if (Game.OnAscend)
						{
							return;
						}
		
						let buffCount = 0;
						let cliclBuffCount = 0;
						for (let i in Game.buffs)
						{
							switch(Game.buffs[i].type.name)
							{
								case "dragonflight":
								case "click frenzy":
									cliclBuffCount++;
									buffCount++;
									break;
								case "dragon harvest":
								case "frenzy":
								case "blood frenzy": //elder frenzy (x666)
								case "sugar frenzy":
								case "building buff":
								case "devastation":
									buffCount++;
									break;
								case "cursed finger":
								default:
									break;
							}
						}
						let mode = CookieAssistant.config.particular.bigCookie.mode;
						let isMode0 = mode == 0;
						let isMode1 = mode == 1 && cliclBuffCount >= 1;
						let isMode2 = mode == 2 && buffCount >= 1;
						let isMode3 = mode == 3 && buffCount >= 2;
						if (isMode0 || isMode1 || isMode2 || isMode3)
						{
							bigCookie.click();
							Game.lastClick = 0;
						}
					},
					CookieAssistant.config.intervals.autoClickBigCookie
				)
			},
			autoClickGoldenCookie: () =>
			{
				CookieAssistant.intervalHandles.autoClickGoldenCookie = setInterval(
					() =>
					{
						Game.shimmers
							.filter(shimmer => shimmer.type == "golden")
							.filter(shimmer => !(CookieAssistant.config.particular.golden.mode == 1 &&shimmer.wrath != 0))
							.forEach(shimmer => shimmer.pop())
					},
					CookieAssistant.config.intervals.autoClickGoldenCookie
				)
			},
			autoClickReindeer: () =>
			{
				CookieAssistant.intervalHandles.autoClickReindeer = setInterval(
					() =>
					{
						Game.shimmers
							.filter(shimmer => shimmer.type == "reindeer")
							.forEach(shimmer => shimmer.pop())
					},
					CookieAssistant.config.intervals.autoClickReindeer
				)
			},
			autoClickFortuneNews: () =>
			{
				CookieAssistant.intervalHandles.autoClickFortuneNews = setInterval(
					() =>
					{
						if (Game.TickerEffect && Game.TickerEffect.type == 'fortune')
						{
							Game.tickerL.click();
						}
					},
					CookieAssistant.config.intervals.autoClickFortuneNews
				)
			},
			autoSpellonBuff: () =>
			{
				CookieAssistant.intervalHandles.autoSpellonBuff = setInterval(
					() =>
					{
						var buffCount = 0;
						for (var i in Game.buffs)
						{
							switch(Game.buffs[i].type.name)
							{
								case "frenzy":
								case "blood frenzy": //elder frenzy (x666)
								case "dragon harvest":
								case "click frenzy":
								case "dragonflight":
								case "sugar frenzy":
								case "building buff":
									buffCount++;
									break;
								case "cursed finger": //ポジティブなバフだが、バフ同士によって相性が悪いため無視する
								case "devastation": //DevastationはMOD側で起こしたいのでユーザーが自発的に起こしたものについては無視する
								default:
									break;
							}
						}
						var grimoire = Game.ObjectsById[7].minigame;
						var spell = grimoire.spells['hand of fate'];
						var cost = 0;
						switch(CookieAssistant.config.particular.spell.mode)
						{
							case 0: //必要最低限のMP
								cost = Math.floor(spell.costMin + grimoire.magicM * spell.costPercent);
								break;
							case 1: //MP完全回復
							default:
								cost = grimoire.magicM;
								break;
						}
						if (cost <= Math.floor(grimoire.magic) && buffCount >= CookieAssistant.modes.spell_buff[CookieAssistant.config.particular.spell.mode2].count)
						{
							grimoire.castSpell(spell);
							CookieAssistant.isAfterSpellcast = true;
							setTimeout(() =>
							{
								if (CookieAssistant.isAfterSpellcast)
								{
									CookieAssistant.isAfterSpellcast = false;
								}
							}, 3000);
						}
					},
					CookieAssistant.config.intervals.autoSpellonBuff
				)
			},
			autoClickWrinklers: () =>
			{
				CookieAssistant.intervalHandles.autoClickWrinklers = setInterval(
					() =>
					{
						Game.wrinklers.forEach(wrinkler =>
						{
							if (wrinkler.close == 1)
							{
								if (CookieAssistant.config.particular.wrinkler.mode == 1 && wrinkler.type == 1)
								{
									return;
								}
								wrinkler.hp = 0;
							}
						});
					},
					CookieAssistant.config.intervals.autoClickWrinklers
				)
			},
			autoBuyElderPledge: () =>
			{
				CookieAssistant.intervalHandles.autoBuyElderPledge = setInterval(
					() =>
					{
						if (Game.UpgradesInStore.indexOf(Game.Upgrades["Elder Pledge"]) != -1)
						{
							Game.Upgrades["Elder Pledge"].buy();
						}
						//ElderPledgeを自動購入してるんだったら生贄用めん棒も買ってほしいはずなのでこっちでも見る
						if (Game.UpgradesInStore.indexOf(Game.Upgrades["Sacrificial rolling pins"]) != -1)
						{
							Game.Upgrades["Sacrificial rolling pins"].buy(1);
						}
					},
					CookieAssistant.config.intervals.autoBuyElderPledge
				)
			},
			autoBuyUpgrades: () =>
			{
				CookieAssistant.intervalHandles.autoBuyUpgrades = setInterval(
					() =>
					{
						for (var i in Game.UpgradesInStore)
						{
							var upgrade = Game.UpgradesInStore[i];
							//保管庫に入っているアップグレードは無視する
							if (upgrade.isVaulted())
							{
								continue;
							}
							//スイッチ類を除いて購入(ElderPledgeもToggle扱いなので考えなくてよい)
							//生贄用めん棒はこっちでも勝手に買われる
							if (upgrade.pool != "toggle")
							{
								//研究を除くモードの時
								if (CookieAssistant.config.particular.upgrades.mode == 1 && upgrade.pool == "tech")
								{
									continue;
								}
								//ババアポカリプスに入りたくないモードの時
								if (CookieAssistant.config.particular.upgrades.mode == 2 && upgrade.name == "One mind")
								{
									continue;
								}
								//チョコの卵モードがONの時
								if (CookieAssistant.config.flags.autoChocolateEgg && upgrade.name == "Chocolate egg")
								{
									continue;
								}
								upgrade.buy(1);
							}
						}
					},
					CookieAssistant.config.intervals.autoBuyUpgrades
				);
			},
			autoSwitchSeason: () =>
			{
				CookieAssistant.intervalHandles.autoSwitchSeason = setInterval(
					() =>
					{
						let isCompletes = [
							(Game.GetHowManyHeartDrops() / Game.heartDrops.length) >= 1,
							((Game.GetHowManySantaDrops() / Game.santaDrops.length) >= 1) && ((Game.GetHowManyReindeerDrops() / Game.reindeerDrops.length) >= 1) && Game.santaLevel >= 14,
							CookieAssistant.config.flags.autoChocolateEgg ? (Game.GetHowManyEggs() / Game.easterEggs.length) >= 1 : (Game.GetHowManyEggs() / Game.easterEggs.length - 1) >= 1 && !Game.Has("Chocolate egg"),
							(Game.GetHowManyHalloweenDrops() / Game.halloweenDrops.length) >= 1,
						];

						//全シーズン完了していて、完了後シーズンと現在のシーズンが同一だったら何もしない
						if (!isCompletes.includes(false) && Game.season == CookieAssistant.modes.season[CookieAssistant.config.particular.season.afterComplete].season)
						{
							return;
						}

						if (Game.season == "")
						{
							CookieAssistant.SwitchNextSeason();
						}
						else if (Game.season == "valentines")
						{
							if (isCompletes[0])
							{
								CookieAssistant.SwitchNextSeason();
							}
						}
						else if (Game.season == "christmas")
						{
							if (Game.GetHowManySantaDrops() / Game.santaDrops.length < 1 || Game.santaLevel < 14)
							{
								Game.specialTab = "santa";
								Game.ToggleSpecialMenu(true);
								Game.UpgradeSanta();
								Game.ToggleSpecialMenu(false);
							}
							if (isCompletes[1])
							{
								CookieAssistant.SwitchNextSeason();
							}
						}
						else if (Game.season == "easter")
						{
							if (isCompletes[2])
							{
								CookieAssistant.SwitchNextSeason();
							}
						}
						else if (Game.season == "halloween")
						{
							let elderCovenant = Game.UpgradesInStore.find(x => x.name == "Elder Covenant");
							let revokeCovenant = Game.UpgradesInStore.find(x => x.name == "Revoke Elder Covenant");

							//エルダー宣誓の自動購入がONのときは強制OFFにする
							if (CookieAssistant.config.flags.autoBuyElderPledge == 1)
							{
								CookieAssistant.config.flags.autoBuyElderPledge = 0;
								clearInterval(CookieAssistant.intervalHandles.autoBuyElderPledge);
								CookieAssistant.intervalHandles.autoBuyElderPledge = null;
							}
							//エルダー宣誓の時間が残っている場合はエルダー誓約を発動する(エルダー宣誓の時間リセットのため)
							if (Game.pledgeT >= 1 && elderCovenant != undefined)
							{
								elderCovenant.buy();
							}
							//エルダー誓約の撤回が出来る場合はする（Wrinklerをスポーンさせる必要があるため）
							if (revokeCovenant != undefined)
							{
								revokeCovenant.buy();
							}
							if (isCompletes[3])
							{
								//エルダー誓約を購入してババアポカリプスを終了させてから次に行く
								if (elderCovenant != undefined)
								{
									elderCovenant.buy(1);
								}
								CookieAssistant.SwitchNextSeason();
							}
						}
					},
					CookieAssistant.config.intervals.autoSwitchSeason
				)
			},
			autoBuyBuildings: () =>
			{
				CookieAssistant.intervalHandles.autoBuyBuildings = setInterval(
					() =>
					{
						if (Game.AscendTimer > 0 || Game.OnAscend)
						{
							return;
						}
						var amountPerPurchase = CookieAssistant.modes.buildings[CookieAssistant.config.particular.buildings.mode].amount;
						for (const objectName in Game.Objects)
						{
							var amount = Game.Objects[objectName].amount % amountPerPurchase == 0 ? amountPerPurchase : amountPerPurchase - Game.Objects[objectName].amount % amountPerPurchase;
							var isMaxDragon = Game.dragonLevel >= Game.dragonLevels.length - 1;
							//ドラゴンの自動育成がONの場合は建物の自動購入を制限する
							if (!isMaxDragon && CookieAssistant.config.flags.autoTrainDragon && Game.Objects[objectName].amount >= 350 - amountPerPurchase)
							{
								amount = 350 - Game.Objects[objectName].amount;
								if (amount <= 0)
								{
									continue;
								}
							}
							if (Game.cookies >= Game.Objects[objectName].getSumPrice(amount))
							{
								//売却モードだったら強制的に購入モードにする
								if (Game.buyMode < 0)
								{
									Game.buyMode = 1;
								}
								Game.Objects[objectName].buy(amount);
							}
						}
					},
					CookieAssistant.config.intervals.autoBuyBuildings
				);
			},
			autoTrainDragon : () =>
			{
				CookieAssistant.intervalHandles.autoTrainDragon = setInterval(
					() =>
					{
						Math.seedrandom(Game.seed+'/dragonTime');
						let drops = ['Dragon scale', 'Dragon claw', 'Dragon fang', 'Dragon teddy bear'];
						drops=shuffle(drops);
						Math.seedrandom();
						let currentDrop = drops[Math.floor((new Date().getMinutes() / 60) * drops.length)];

						let canTrain = Game.dragonLevel < Game.dragonLevels.length - 1 && Game.dragonLevels[Game.dragonLevel].cost();
						let canPet = Game.dragonLevel >= 8 && Game.Has("Pet the dragon") && !Game.Has(currentDrop) && !Game.HasUnlocked(currentDrop);

						if (canTrain || canPet)
						{
							Game.specialTab = "dragon";
							Game.ToggleSpecialMenu(true);
							//育成
							if (canTrain)
							{
								Game.UpgradeDragon();
								if (Game.dragonLevel == Game.dragonLevels.length - 1)
								{
									Game.SetDragonAura(CookieAssistant.config.particular.dragon.aura1, 0);
									Game.ConfirmPrompt();
									Game.SetDragonAura(CookieAssistant.config.particular.dragon.aura2, 1);
									Game.ConfirmPrompt();
								}
							}
							//なでる
							if (canPet)
							{
								Game.ClickSpecialPic();
							}
							Game.ToggleSpecialMenu(false);
						}
					},
					CookieAssistant.config.intervals.autoTrainDragon
				);
			},
			autoSetSpirits : () =>
			{
				CookieAssistant.intervalHandles.autoSetSpirits = setInterval(
					() =>
					{
						if(Game.Objects['Temple'].minigame == undefined || !Game.Objects['Temple'].minigameLoaded)
						{
							return;
						}
						var pantheon = Game.Objects['Temple'].minigame;
						if (pantheon.slot[0] == -1)
						{
							pantheon.dragGod(pantheon.godsById[CookieAssistant.config.particular.spirits.slot1]);
							pantheon.hoverSlot(0);
							pantheon.dropGod();
							pantheon.hoverSlot(-1);
						}
						if (pantheon.slot[1] == -1)
						{
							pantheon.dragGod(pantheon.godsById[CookieAssistant.config.particular.spirits.slot2]);
							pantheon.hoverSlot(1);
							pantheon.dropGod();
							pantheon.hoverSlot(-1);
						}
						if (pantheon.slot[2] == -1)
						{
							pantheon.dragGod(pantheon.godsById[CookieAssistant.config.particular.spirits.slot3]);
							pantheon.hoverSlot(2);
							pantheon.dropGod();
							pantheon.hoverSlot(-1);
						}
					},
					CookieAssistant.config.intervals.autoSetSpirits
				);
			},
			autoHarvestSugarlump : () =>
			{
				CookieAssistant.intervalHandles.autoHarvestSugarlump = setInterval(
					() =>
					{
						//砂糖玉がアンロックされているかチェック
						if (!Game.canLumps())
						{
							return;
						}
						var age = Date.now() - Game.lumpT;
						if (age > Game.lumpRipeAge && age < Game.lumpOverripeAge)
						{
							Game.clickLump();
						}
					},
					CookieAssistant.config.intervals.autoHarvestSugarlump
				);
			},
			autoSellBuilding : () =>
			{
				CookieAssistant.intervalHandles.autoSellBuilding = setInterval(
					() =>
					{
						for(var i = 0; i < CookieAssistant.config.particular.sell.isAfterSell.length; i++)
						{
							var target = CookieAssistant.config.particular.sell.target[i];
							var amount = CookieAssistant.config.particular.sell.amount[i];
							var activate_mode = CookieAssistant.config.particular.sell.activate_mode[i];
							var after_mode = CookieAssistant.config.particular.sell.after_mode[i];
							var isSold = CookieAssistant.sellBuildings(i, target, amount, activate_mode, after_mode);
						}
					},
					CookieAssistant.config.intervals.autoSellBuilding
				);
			},
			autoToggleGoldenSwitch : () =>
			{
				CookieAssistant.intervalHandles.autoToggleGoldenSwitch = setInterval(
					() =>
					{
						let off = Game.UpgradesInStore.find(x => x.name == "Golden switch [off]");
						let on = Game.UpgradesInStore.find(x => x.name == "Golden switch [on]");
						let enableMode = CookieAssistant.config.particular.goldenSwitch.enable;
						let disableMode = CookieAssistant.config.particular.goldenSwitch.disable;
						let buffCount = 0;
						let cliclBuffCount = 0;
						for (let i in Game.buffs)
						{
							switch(Game.buffs[i].type.name)
							{
								case "dragonflight":
								case "click frenzy":
									cliclBuffCount++;
									buffCount++;
									break;
								case "dragon harvest":
								case "frenzy":
								case "blood frenzy": //elder frenzy (x666)
								case "sugar frenzy":
								case "building buff":
								case "devastation":
									buffCount++;
									break;
								case "cursed finger":
								default:
									break;
							}
						}
						//スイッチがOFFのとき
						if (off != undefined)
						{
							let isMode0 = enableMode == 0 && buffCount >= 1;
							let isMode1 = enableMode == 1 && buffCount >= 2;
							let isMode2 = enableMode == 2 && cliclBuffCount >= 1;
							let isMode3 = enableMode == 3 && buffCount >= 2 && cliclBuffCount >= 1;

							if (isMode0 || isMode1 || isMode2 || isMode3)
							{
								off.buy();
							}
						}
						//スイッチがONのとき
						if (on != undefined)
						{
							let isMode0 = disableMode == 0 && buffCount == 0;
							let isMode1 = disableMode == 1 && cliclBuffCount == 0;

							if (isMode0 || isMode1)
							{
								on.buy();
							}
						}
					},
					CookieAssistant.config.intervals.autoToggleGoldenSwitch
				);
			},
			autoHireBrokers : () =>
			{
				CookieAssistant.intervalHandles.autoHireBrokers = setInterval(
					() =>
					{
						let market = Game.Objects["Bank"].minigame;
						if (market == undefined || !Game.Objects["Bank"].minigameLoaded)
						{
							return;
						}
						//Hire
						if (market.brokers < market.getMaxBrokers() && Game.cookies >= market.getBrokerPrice())
						{
							l('bankBrokersBuy').click();
						}
						//Upgrade
						let currentOffice = market.offices[market.officeLevel];
						if (currentOffice.cost && Game.Objects['Cursor'].amount >= currentOffice.cost[0] && Game.Objects['Cursor'].level >= currentOffice.cost[1])
						{
							l('bankOfficeUpgrade').click();
						}
					},
					CookieAssistant.config.intervals.autoHireBrokers
				);
			},
		}
		
		Game.Notify('CookieAssistant loaded!', '', '', 1, 1);
		CookieAssistant.CheckVersion();
		CookieAssistant.CheckUpdate();
	}

	CookieAssistant.sellBuildings = function(index, target, amount, activate_mode, after_mode)
	{
		var objectName = Game.ObjectsById[target].name;
		var amount = parseInt(amount);
		if (amount <= 0)
		{
			return;
		}
		if (CookieAssistant.config.particular.sell.isAfterSell[index])
		{
			if (after_mode == 2)//Do nothing
			{
				CookieAssistant.config.particular.sell.isAfterSell[index] = 0;
				return false;
			}
			if (after_mode == 1)//Spellcast and buy back
			{
				var grimoire = Game.ObjectsById[7].minigame;
				if (grimoire == undefined)
				{
					Game.Notify(CookieAssistant.name, "You have not unlocked the Grimoire yet, so failed to spellcast.<br />グリモア解放前のため、呪文の発動に失敗しました。", "", 3);
					CookieAssistant.config.particular.sell.isAfterSell[index] = 0;
					return false;
				}
				var spell = grimoire.spells['hand of fate'];
				var cost = Math.floor(spell.costMin + grimoire.magicM * spell.costPercent);
				if (cost <= Math.floor(grimoire.magic))
				{
					grimoire.castSpell(spell);
				}
			}
			if (Game.cookies >= Game.Objects[objectName].getSumPrice(amount))
			{
				if (Game.buyMode < 0)
				{
					Game.buyMode = 1;
				}
				Game.Objects[objectName].buy(amount);
			}
			else
			{
				Game.Notify(CookieAssistant.name, "クッキーが足りず建物を買い戻せませんでした。<br />Not have enough cookies to buy back");
			}
			CookieAssistant.config.particular.sell.isAfterSell[index] = 0;
			return false;
		}

		
		var buffCount = 0;
		var cliclBuffCount = 0;
		for (var i in Game.buffs)
		{
			switch(Game.buffs[i].type.name)
			{
				case "dragonflight":
				case "click frenzy":
					cliclBuffCount++;
					buffCount++;
					break;
				case "dragon harvest":
				case "frenzy":
				case "blood frenzy": //elder frenzy (x666)
				case "sugar frenzy":
				case "building buff":
					buffCount++;
					break;
				case "devastation":
				case "cursed finger":
				default:
					break;
			}
		}
		
		var isMode0 = activate_mode == 0 && buffCount >= 1;
		var isMode1 = activate_mode == 1 && buffCount >= 2;
		var isMode2 = activate_mode == 2 && cliclBuffCount >= 1;
		var isMode3 = activate_mode == 3 && buffCount >= 2 && cliclBuffCount >= 1;
		var isMode4 = activate_mode == 4 && CookieAssistant.isAfterSpellcast;
		var isMode5 = activate_mode == 5;
		var isMode6 = activate_mode == 6 && buffCount >= 3;
		if (isMode0 || isMode1 || isMode2 || isMode3 || isMode4 || isMode5 || isMode6)
		{
			if (Game.Objects[objectName].amount < amount)
			{
				Game.Notify(CookieAssistant.name, "建物が少ないため売却に失敗しました。<br />Could not sell buildings due to not enough.");
				return false;
			}
			Game.Objects[objectName].sell(amount);
			CookieAssistant.config.particular.sell.isAfterSell[index] = 1;
			CookieAssistant.isAfterSpellcast = false;
			return true;
		}
	}

	CookieAssistant.restoreDefaultConfig = function(mode){
		CookieAssistant.config = CookieAssistant.defaultConfig();
		if(mode == 2)
		{
			CookieAssistant.save(CookieAssistant.config);
		}
	}

	CookieAssistant.SwitchNextSeason = function()
	{
		let seasons = ["valentines", "christmas", "easter", "halloween"];
		let isCompletes = [
			(Game.GetHowManyHeartDrops() / Game.heartDrops.length) >= 1,
			((Game.GetHowManySantaDrops() / Game.santaDrops.length) >= 1) && ((Game.GetHowManyReindeerDrops() / Game.reindeerDrops.length) >= 1) && Game.santaLevel >= 14,
			(Game.GetHowManyEggs() / Game.easterEggs.length) >= 1,
			(Game.GetHowManyHalloweenDrops() / Game.halloweenDrops.length) >= 1,
		];
		
		if (CookieAssistant.config.flags.autoChocolateEgg && !isCompletes[2])
		{
			isCompletes[2] = Game.GetHowManyEggs() == Game.easterEggs.length - 1 && !Game.Has("Chocolate egg");
		}

		let targetSeason = "";
		let afterCompleteSeason = CookieAssistant.modes.season[CookieAssistant.config.particular.season.afterComplete].season;
		
		for (let i in seasons)
		{
			if (!isCompletes[i])
			{
				targetSeason = seasons[i];
				break;
			}
		}
		if (targetSeason == "" && afterCompleteSeason != "")
		{
			targetSeason = afterCompleteSeason;
		}
		//全シーズンのアップグレードが完了していて現在どこかのシーズンになっている
		if (Game.season != "" && targetSeason == "")
		{
			//シーズン終了
			Game.seasonT = -1;
		}
		if (targetSeason != "" && targetSeason != Game.season)
		{
			if (Game.UpgradesInStore.indexOf(Game.Upgrades[Game.seasons[targetSeason].trigger]) != -1)
			{
				Game.Upgrades[Game.seasons[targetSeason].trigger].buy(1);
			}
		}
	}

	CookieAssistant.OnPreAscend = function()
	{
		if (CookieAssistant.config.flags.autoChocolateEgg)
		{
			CookieAssistant.BuyChocolateEgg();
		}
	}

	CookieAssistant.BuyChocolateEgg = function()
	{
		let egg = Game.UpgradesInStore.find(x => x.name == "Chocolate egg");
		if (egg == undefined)
		{
			Game.Notify(CookieAssistant.name, "チョコの卵の購入に失敗しました。<br />Failed to buy Chocolate Egg.");
			return;
		}
		if (Game.dragonLevel >= 8 && !Game.hasAura("Earth Shatterer"))
		{
			Game.SetDragonAura(5, 0);
			Game.ConfirmPrompt();
		}
		for (let objectName in Game.Objects) {
			let building = Game.Objects[objectName];
			if (building.amount > 0)
			{
				building.sell(building.amount);
			}
		}
		egg.buy();
	}

	//コンフィグのチェック
	//アプデ時に新規項目がundefinedになって1ms周期の実行になってしまうのを防止
	CookieAssistant.CheckConfig = function()
	{		
		var defaultConfig = CookieAssistant.defaultConfig();
		for (const [key, value] of Object.entries(defaultConfig.flags))
		{
			if (CookieAssistant.config.flags[key] == undefined)
			{
				CookieAssistant.config.flags[key] = value;
			}
		}
		for (const [key, value] of Object.entries(defaultConfig.intervals))
		{
			if (CookieAssistant.config.intervals[key] == undefined)
			{
				CookieAssistant.config.intervals[key] = value;
			}
		}
		if (CookieAssistant.config.particular == undefined)
		{
			CookieAssistant.config.particular = defaultConfig.particular;
		}
		
		for (const [key, value] of Object.entries(defaultConfig.particular))
		{
			if (CookieAssistant.config.particular[key] == undefined)
			{
				CookieAssistant.config.particular[key] = value;
			}
			for (const [key_p, value_p] of Object.entries(defaultConfig.particular[key]))
			{
				if (CookieAssistant.config.particular[key][key_p] == undefined)
				{
					CookieAssistant.config.particular[key][key_p] = value_p;
				}
			}
		}
	}


	//オプション&統計の追加
	CookieAssistant.ReplaceGameMenu = function()
	{
		Game.customOptionsMenu.push(function()
		{
			CCSE.AppendCollapsibleOptionsMenu(CookieAssistant.name, CookieAssistant.getMenuString());
		});
		
		Game.customStatsMenu.push(function()
		{
			CCSE.AppendStatsVersionNumber(CookieAssistant.name, CookieAssistant.version);
		});
	}
	
	CookieAssistant.getMenuString = function()
	{
		let m = CCSE.MenuHelper;
		str = m.Header('Basic Assists');
		//大クッキークリック
		str +=	'<div class="listing">'
				+ m.ToggleButton(CookieAssistant.config.flags, 'autoClickBigCookie', 'CookieAssistant_autoClickBigCookieButton', '自动点击Cookie ON', '自动点击Cookie OFF', "CookieAssistant.Toggle")
				+ '<label>间隔（毫秒）: </label>'
				+ m.InputBox("CookieAssistant_Interval_autoClickBigCookie", 40, CookieAssistant.config.intervals.autoClickBigCookie, "CookieAssistant.ChangeInterval('autoClickBigCookie', this.value)")
					+ '<label></label><a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.bigCookie.isMute++; if(CookieAssistant.config.particular.bigCookie.isMute >= 2){CookieAssistant.config.particular.bigCookie.isMute = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ (CookieAssistant.config.particular.bigCookie.isMute ? '静音点击音效' : '播放点击音效')
					+ '</a><br />'
				+ '<div class="listing">'
					+ '<label>模式 : </label>'
					+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.bigCookie.mode++; if(CookieAssistant.config.particular.bigCookie.mode >= Object.keys(CookieAssistant.modes.bigCookie).length){CookieAssistant.config.particular.bigCookie.mode = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.bigCookie[CookieAssistant.config.particular.bigCookie.mode].desc
					+ '</a><br />'
				+ '</div>'
				+ '</div>';
		//黄金クッキークリック
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoClickGoldenCookie', 'CookieAssistant_autoClickGoldenCookieButton', '自动点击 ' + loc("Golden cookie") + ' ON', '自动点击 ' + loc("Golden cookie") + ' OFF', "CookieAssistant.Toggle")
				+ '<label>间隔（毫秒）: </label>'
				+ m.InputBox("CookieAssistant_Interval_autoClickBigCookie", 40, CookieAssistant.config.intervals.autoClickGoldenCookie, "CookieAssistant.ChangeInterval('autoClickGoldenCookie', this.value)")
				+ '<div class="listing">'
					+ '<label>模式 : </label>'
					+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.golden.mode++; if(CookieAssistant.config.particular.golden.mode >= Object.keys(CookieAssistant.modes.golden).length){CookieAssistant.config.particular.golden.mode = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.golden[CookieAssistant.config.particular.golden.mode].desc
					+ '</a><br />'
				+ '</div>'
				+ '</div>';
		//虫撃破
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoClickWrinklers', 'CookieAssistant_autoClickWrinklers', '自动点击 ' + loc("wrinkler") + ' ON', '自动点击 ' + loc("wrinkler") + ' OFF', "CookieAssistant.Toggle")
				+ '<label>间隔（毫秒）: </label>'
				+ m.InputBox("CookieAssistant_Interval_autoClickWrinklers", 40, CookieAssistant.config.intervals.autoClickWrinklers, "CookieAssistant.ChangeInterval('autoClickWrinklers', this.value)")
				+ '<div class="listing">'
							+ '<label>模式 : </label>'
							+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.wrinkler.mode++; if(CookieAssistant.config.particular.wrinkler.mode >= Object.keys(CookieAssistant.modes.wrinkler).length){CookieAssistant.config.particular.wrinkler.mode = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
									+ CookieAssistant.modes.wrinkler[CookieAssistant.config.particular.wrinkler.mode].desc
							+ '</a><br />'
						+ '</div>'
				+ '</div>';
		//トナカイクリック
		str +=  '<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoClickReindeer', 'CookieAssistant_autoClickReindeerButton', '自动点击 ' + loc("Reindeer") + ' ON', '自动点击 ' + loc("Reindeer") + ' OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoClickReindeer", 40, CookieAssistant.config.intervals.autoClickReindeer, "CookieAssistant.ChangeInterval('autoClickReindeer', this.value)");
				}
		str +=	'</div>';
		//FortuneNewsクリック
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoClickFortuneNews', 'CookieAssistant_autoClickFortuneNewsButton', '自动点击幸运新闻 ON', '自动点击幸运新闻 OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoClickFortuneNews", 40, CookieAssistant.config.intervals.autoClickFortuneNews, "CookieAssistant.ChangeInterval('autoClickFortuneNews', this.value)");
				}
		str +=	'</div>';
		//ElderPedge自動購入
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoBuyElderPledge', 'CookieAssistant_autoBuyElderPledge', '自动购买 ' + loc("[Upgrade name 74]Elder Pledge") + ' ON', '自动购买 ' + loc("[Upgrade name 74]Elder Pledge") + ' OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoBuyElderPledge", 40, CookieAssistant.config.intervals.autoBuyElderPledge, "CookieAssistant.ChangeInterval('autoBuyElderPledge', this.value)");
				}
		str +=	'<div class="listing">'
					+ '<label>※该功能还将自动购买 "献祭擀面杖"。</label><br />'
				+ '</div>'
				+ '</div>';
		//アップグレード自動購入
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoBuyUpgrades', 'CookieAssistant_autoBuyUpgrades', '自动购买 ' + loc("upgrade") + ' ON', '自动购买 ' + loc("upgrade") + ' OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoBuyUpgrades", 40, CookieAssistant.config.intervals.autoBuyUpgrades, "CookieAssistant.ChangeInterval('autoBuyUpgrades', this.value)");
				}
		str +=	'<div class="listing">'
					+ '<label>模式 : </label>'
					+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.upgrades.mode++; if(CookieAssistant.config.particular.upgrades.mode >= Object.keys(CookieAssistant.modes.upgrades).length){CookieAssistant.config.particular.upgrades.mode = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.upgrades[CookieAssistant.config.particular.upgrades.mode].desc
					+ '</a><br />'
				+ '</div>'
				+ '</div>';
		//建物自動購入
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoBuyBuildings', 'CookieAssistant_autoBuyBuildings', '自动购买 ' + loc("building") + ' ON', '自动购买 ' + loc("building") + ' OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoBuyBuildings", 40, CookieAssistant.config.intervals.autoBuyBuildings, "CookieAssistant.ChangeInterval('autoBuyBuildings', this.value)");
				}
		str +=	'<div class="listing">'
					+ '<label>模式 : </label>'
					+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.buildings.mode++; if(CookieAssistant.config.particular.buildings.mode >= Object.keys(CookieAssistant.modes.buildings).length){CookieAssistant.config.particular.buildings.mode = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.buildings[CookieAssistant.config.particular.buildings.mode].desc
					+ '</a><br />'
				+ '</div>'
				+ '</div>';
		//砂糖玉自動収穫
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoHarvestSugarlump', 'CookieAssistant_autoHarvestSugarlump', '自动收获 ' + loc("sugar lump") + ' ON', '自动收获 ' + loc("sugar lump") + ' OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoHarvestSugarlump", 40, CookieAssistant.config.intervals.autoHarvestSugarlump, "CookieAssistant.ChangeInterval('autoHarvestSugarlump', this.value)");
				}
		str +=	'</div>';
		
		str += "<br>"
		str += m.Header('Advanced Assists');

		//自動詠唱
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoSpellonBuff', 'CookieAssistant_autoSpellonBuff', '自动释放法术 ' + loc("Force the Hand of Fate") + ' ON', '自动释放法术 ' + loc("Force the Hand of Fate") + ' OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoSpellonBuff", 40, CookieAssistant.config.intervals.autoSpellonBuff, "CookieAssistant.ChangeInterval('autoSpellonBuff', this.value)");
				}
		str +=	'<div class="listing">'
					+ '<label>释放条件 : </label>'
					+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.spell.mode++; if(CookieAssistant.config.particular.spell.mode >= Object.keys(CookieAssistant.modes.spell).length){CookieAssistant.config.particular.spell.mode = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.spell[CookieAssistant.config.particular.spell.mode].desc
					+ '</a>'
					+ '<label> 和 </label>'
					+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.spell.mode2++; if(CookieAssistant.config.particular.spell.mode2 >= Object.keys(CookieAssistant.modes.spell_buff).length){CookieAssistant.config.particular.spell.mode2 = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.spell_buff[CookieAssistant.config.particular.spell.mode2].desc
					+ '</a>'
				+ '</div>'
				+ '</div>';
		
		//シーズン自動切換え
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoSwitchSeason', 'CookieAssistant_autoSwitchSeason', '自动切换节日 ON', '自动切换节日 OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str +='<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoSwitchSeason", 40, CookieAssistant.config.intervals.autoSwitchSeason, "CookieAssistant.ChangeInterval('autoSwitchSeason', this.value)");
				}
		str +=	'<div class="listing">'
				+ '<label>当全部季节升级完后切换到 : </label>'
				+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.season.afterComplete++; if(CookieAssistant.config.particular.season.afterComplete >= Object.keys(CookieAssistant.modes.season).length){CookieAssistant.config.particular.season.afterComplete = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
						+ CookieAssistant.modes.season[CookieAssistant.config.particular.season.afterComplete].desc
				+ '</a><br />'
				+ '</div>'
		str +=	'<div class="listing">'
					+ '<label>自动切换到未完成升级的季节。</label><br />'
				+ '</div>'
				+ '</div>';

		//ドラゴン自動育成
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoTrainDragon', 'CookieAssistant_autoTrainDragon', '自动训练龙 ON', '自动训练龙 OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoTrainDragon", 40, CookieAssistant.config.intervals.autoTrainDragon, "CookieAssistant.ChangeInterval('autoTrainDragon', this.value)");
				}
		str +=	'<div class="listing">'
					+ '<label>光环1 : </label>'
						+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.dragon.aura1++; if(CookieAssistant.config.particular.dragon.aura1 >= Object.keys(Game.dragonAuras).length){CookieAssistant.config.particular.dragon.aura1 = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ Game.dragonAuras[CookieAssistant.config.particular.dragon.aura1].dname
						+ '</a>'
					+ '<label>      光环2 : </label>'
						+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.dragon.aura2++; if(CookieAssistant.config.particular.dragon.aura2 >= Object.keys(Game.dragonAuras).length){CookieAssistant.config.particular.dragon.aura2 = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ Game.dragonAuras[CookieAssistant.config.particular.dragon.aura2].dname
						+ '</a><br />'
				+ '</div>'
				+ '</div>';

		//パンテオンのスロット自動セット
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoSetSpirits', 'CookieAssistant_autoSetSpirits', '自动设置神灵 ON', '自动设置神灵 OFF', "CookieAssistant.Toggle");
				if (CookieAssistant.showAllIntervals)
				{
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoSetSpirits", 40, CookieAssistant.config.intervals.autoSetSpirits, "CookieAssistant.ChangeInterval('autoSetSpirits', this.value)");
				}
		str +=	'<div class="listing">';

				if (Game.Objects['Temple'].minigame != undefined && Game.Objects['Temple'].minigameLoaded)
				{
					str +=	'<label>钻石槽 : </label>'
							+ `<a class="option" ` + Game.clickStr + `=" CookieAssistant.config.particular.spirits.slot1++; if(CookieAssistant.config.particular.spirits.slot1 >= Object.keys(Game.Objects['Temple'].minigame.gods).length){CookieAssistant.config.particular.spirits.slot1 = 0;} Game.UpdateMenu();">`
								+ Game.Objects['Temple'].minigame.godsById[CookieAssistant.config.particular.spirits.slot1].name
							+ '</a>'
							+ '<label>红宝石槽 : </label>'
							+ `<a class="option" ` + Game.clickStr + `=" CookieAssistant.config.particular.spirits.slot2++; if(CookieAssistant.config.particular.spirits.slot2 >= Object.keys(Game.Objects['Temple'].minigame.gods).length){CookieAssistant.config.particular.spirits.slot2 = 0;} Game.UpdateMenu();">`
								+ Game.Objects['Temple'].minigame.godsById[CookieAssistant.config.particular.spirits.slot2].name
							+ '</a>'
							+ '<label>玉石槽 : </label>'
							+ `<a class="option" ` + Game.clickStr + `=" CookieAssistant.config.particular.spirits.slot3++; if(CookieAssistant.config.particular.spirits.slot3 >= Object.keys(Game.Objects['Temple'].minigame.gods).length){CookieAssistant.config.particular.spirits.slot3 = 0;} Game.UpdateMenu();">`
								+ Game.Objects['Temple'].minigame.godsById[CookieAssistant.config.particular.spirits.slot3].name
							+ '</a>';
				}
				else
				{
					str += "<label>⚠️您尚未解锁万神殿。该功能在解锁前无法使用。</label><br />";
				}
		str +=	'</div></div>'
		
		//建物自動売却
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoSellBuilding', 'CookieAssistant_autoSellBuilding', '自动卖出建筑物 ON', '自动卖出建筑物 OFF', "CookieAssistant.Toggle");
					str += '<label>间隔（毫秒）: </label>'
						+ m.InputBox("CookieAssistant_Interval_autoSellBuilding", 40, CookieAssistant.config.intervals.autoSellBuilding, "CookieAssistant.ChangeInterval('autoSellBuilding', this.value)");
		str +=	'<div class="listing"><ol style="list-style: inside;list-style-type: decimal;">';
				for (var i_sellconf = 0; i_sellconf < CookieAssistant.config.particular.sell.isAfterSell.length; i_sellconf++)
				{
					str += '<li><label>卖出 </label>'
						+ '<a class="option" ' + Game.clickStr + '="CookieAssistant.config.particular.sell.target[' + i_sellconf + ']++; if(CookieAssistant.config.particular.sell.target[' + i_sellconf + '] >= Object.keys(Game.Objects).length){CookieAssistant.config.particular.sell.target[' + i_sellconf + '] = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ Game.ObjectsById[CookieAssistant.config.particular.sell.target[i_sellconf]].dname
						+ '</a>'
					+ '<label> 卖出数额： </label>'
					+ m.InputBox("CookieAssistant_Amount_autoSellBuilding", 40, CookieAssistant.config.particular.sell.amount[i_sellconf], "CookieAssistant.config.particular.sell.amount[" + i_sellconf + "] = this.value;")
					+ '<label>卖出条件： </label>'
						+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.sell.activate_mode[' + i_sellconf + ']++; if(CookieAssistant.config.particular.sell.activate_mode[' + i_sellconf + '] >= Object.keys(CookieAssistant.modes.sell_buildings).length){CookieAssistant.config.particular.sell.activate_mode[' + i_sellconf + '] = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.sell_buildings[CookieAssistant.config.particular.sell.activate_mode[i_sellconf]].desc
						+ '</a><br />'
					+ '<label>完成售出后的操作 : </label>'
						+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.sell.after_mode[' + i_sellconf + ']++; if(CookieAssistant.config.particular.sell.after_mode[' + i_sellconf + '] >= Object.keys(CookieAssistant.modes.sell_buildings_after).length){CookieAssistant.config.particular.sell.after_mode[' + i_sellconf + '] = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
							+ CookieAssistant.modes.sell_buildings_after[CookieAssistant.config.particular.sell.after_mode[i_sellconf]].desc
						+ '</a><br /></li>';
				}
		str +=	'</ol>';
		str +=	'<a class="option" ' + Game.clickStr + '="CookieAssistant.addSellConfig(); Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">添加配置</a>';
		if (CookieAssistant.config.particular.sell.isAfterSell.length > 0)
		{
			str +=	'<a class="option" ' + Game.clickStr + '="CookieAssistant.removeSellConfig(); Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">删除最后一个配置</a>';
		}
		str +=	'</div></div>';
				
		if (CookieAssistant.config.flags.autoSellBuilding)
		{
			var temple = Game.Objects['Temple'].minigame;
			if (temple == undefined || !Game.Objects['Temple'].minigameLoaded || !temple.slot.includes(2))
			{
				str += "<label><b style='color: #ff3705'>⚠️万神殿神灵未设置，因此启用此功能可能没有任何好处。</b></label><br />";
			}
		}

		//ゴールデンスイッチ自動切換え
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoToggleGoldenSwitch', 'CookieAssistant_autoToggleGoldenSwitch', '自动切换 ' + loc("[Upgrade name 327]Golden switch") + ' ON', '自动切换 ' + loc("[Upgrade name 327]Golden switch") + ' OFF', "CookieAssistant.Toggle")
			+ '<div class="listing">'
				+ '<label>开启条件 : </label>'
				+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.goldenSwitch.enable++; if(CookieAssistant.config.particular.goldenSwitch.enable >= Object.keys(CookieAssistant.modes.goldenSwitch_enable).length){CookieAssistant.config.particular.goldenSwitch.enable = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
						+ CookieAssistant.modes.goldenSwitch_enable[CookieAssistant.config.particular.goldenSwitch.enable].desc
				+ '</a><br />'
				+ '<label>关闭条件 : </label>'
				+ '<a class="option" ' + Game.clickStr + '=" CookieAssistant.config.particular.goldenSwitch.disable++; if(CookieAssistant.config.particular.goldenSwitch.disable >= Object.keys(CookieAssistant.modes.goldenSwitch_disable).length){CookieAssistant.config.particular.goldenSwitch.disable = 0;} Game.UpdateMenu(); PlaySound(\'snd/tick.mp3\');">'
						+ CookieAssistant.modes.goldenSwitch_disable[CookieAssistant.config.particular.goldenSwitch.disable].desc
				+ '</a><br />'
			+ '</div>'
			+ '</div>';

		//ブローカー自動雇用
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoHireBrokers', 'CookieAssistant_autoHireBrokers', '自动雇用经纪人 ON', '自动雇用经纪人 OFF', "CookieAssistant.Toggle");
		if (CookieAssistant.showAllIntervals)
		{
			str += '<label>间隔（毫秒）: </label>'
				+ m.InputBox("CookieAssistant_Interval_autoHireBrokers", 40, CookieAssistant.config.intervals.autoHireBrokers, "CookieAssistant.ChangeInterval('autoHireBrokers', this.value)");
		}
		str += '</div>';

		str += "<br />"
		str += m.Header('特殊配置');

		//ChocolateEgg
		str +=	'<div class="listing">' + m.ToggleButton(CookieAssistant.config.flags, 'autoChocolateEgg', 'CookieAssistant_autoChocolateEgg', '自动购买 ' + loc("[Upgrade name 227]Chocolate egg") + ' ON', '自动切换 ' + loc("[Upgrade name 227]Chocolate egg") + ' OFF', "CookieAssistant.Toggle")
			+ '</div>';

		str += "<br />"
		str += m.Header('杂项');
		str += '<div class="listing">'
				+ m.ActionButton("CookieAssistant.showAllIntervals = !CookieAssistant.showAllIntervals; Game.UpdateMenu();", (CookieAssistant.showAllIntervals ? '隐藏' : '显示所有') + ' 点击间隔设置')
				+ m.ActionButton("CookieAssistant.restoreDefaultConfig(2); CookieAssistant.DoAction(); Game.UpdateMenu();", '重置配置')
				+ m.ActionButton("CookieAssistant.CheckUpdate();", '检查更新')
				+ m.ActionButton("Steam.openLink('https://steamcommunity.com/sharedfiles/filedetails/?id=2596469882');", '获取更多信息')
				+ '<label>Version : ' + CookieAssistant.version + '</label>'
			+ '</div>';

		return str;
	}
	
	CookieAssistant.Toggle = function(prefName, button, on, off, invert)
	{
		if(CookieAssistant.config.flags[prefName])
		{
			l(button).innerHTML = off;
			CookieAssistant.config.flags[prefName] = 0;
		}
		else
		{
			l(button).innerHTML = on;
			CookieAssistant.config.flags[prefName] = 1;
		}
		l(button).className = 'option' + ((CookieAssistant.config.flags[prefName] ^ invert) ? '' : ' off');
		CookieAssistant.DoAction();
	}

	CookieAssistant.ChangeInterval = function(prefName, value)
	{
		CookieAssistant.config.intervals[prefName] = value;
		CookieAssistant.DoAction();
	}

	CookieAssistant.DoAction = function()
	{
		for (const [key, isClick] of Object.entries(CookieAssistant.config.flags))
		{
			if (CookieAssistant.actions[key] == undefined)
			{
				continue;
			}
			if (isClick)
			{
				if (CookieAssistant.intervalHandles[key] == null)
				{
					CookieAssistant.actions[key]();
				}
				else
				{
					clearInterval(CookieAssistant.intervalHandles[key]);
					CookieAssistant.intervalHandles[key] = null;
					CookieAssistant.actions[key]();
				}
			}
			else if (CookieAssistant.intervalHandles[key] != null)
			{
				clearInterval(CookieAssistant.intervalHandles[key]);
				CookieAssistant.intervalHandles[key] = null;
			}
		}
	}

	CookieAssistant.addSellConfig = function()
	{
		CookieAssistant.config.particular.sell.isAfterSell.push(0);
		CookieAssistant.config.particular.sell.target.push(0);
		CookieAssistant.config.particular.sell.amount.push(0);
		CookieAssistant.config.particular.sell.activate_mode.push(0);
		CookieAssistant.config.particular.sell.after_mode.push(0);
		return;
	}

	CookieAssistant.removeSellConfig = function()
	{
		CookieAssistant.config.particular.sell.isAfterSell.pop();
		CookieAssistant.config.particular.sell.target.pop();
		CookieAssistant.config.particular.sell.amount.pop();
		CookieAssistant.config.particular.sell.activate_mode.pop();
		CookieAssistant.config.particular.sell.after_mode.pop();
		return;
	}
	
	CookieAssistant.save = function()
	{
		return JSON.stringify(CookieAssistant.config);
	}

	CookieAssistant.load = function(str)
	{
		CookieAssistant.config = JSON.parse(str);
		CookieAssistant.CheckConfig();
		CookieAssistant.DoAction();
	}

	//バージョンアップ直後だったらリリースノートに誘導する
	CookieAssistant.CheckVersion = function()
	{
		let lastVersion = CookieAssistant.config.particular.system.lastVersion;
		if (lastVersion == '')
		{
			CookieAssistant.config.particular.system.lastVersion = CookieAssistant.version;
			return;
		}
		else if (lastVersion != CookieAssistant.version)
		{
			Game.Notify(CookieAssistant.name,
				loc("已是最新版") + " : " + lastVersion + " => " + CookieAssistant.version + "<br>"
				+ `<a ${Game.clickStr}="Steam.openLink('https://github.com/PianCat/CookieAssistant/releases/latest')" target="_brank">` + loc("您可以从这里查看更新说明。") + `</a>`);
		}
	}

	CookieAssistant.CheckUpdate = async function()
	{
		var res = await fetch("https://api.github.com/repos/PianCat/CookieAssistant/releases/latest")
		var json = await res.json()

		if(json.tag_name == CookieAssistant.version)
		{
			Game.Notify(CookieAssistant.name, '已是最新版', "", 3)
			return;
		}

		Game.Notify(CookieAssistant.name, `<b style="color: #ff8000">` + loc("检查到更新。")  + `</b><br><a ${Game.clickStr}="Steam.openLink('${json.assets[0].browser_download_url}')" target="_brank">` + loc("在此处下载。") + `</a>`)
		Game.UpdateMenu();
	}

	if(CCSE.ConfirmGameVersion(CookieAssistant.name, CookieAssistant.version, CookieAssistant.GameVersion))
	{
		Game.registerMod(CookieAssistant.name, CookieAssistant);
	}
}

if(!CookieAssistant.isLoaded)
{
	if(CCSE && CCSE.isLoaded)
	{
		CookieAssistant.launch();
	}
	else
	{
		if(!CCSE) var CCSE = {};
		if(!CCSE.postLoadHooks) CCSE.postLoadHooks = [];
		CCSE.postLoadHooks.push(CookieAssistant.launch);
	}
}
