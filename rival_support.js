﻿/*--------------------------------------------------------------------------
　敵対勢力に支援効果を与えるスクリプト(以外にも色々) ver 1.5
■作成者
キュウブ

■概要
スキル「支援」で敵対勢力に対して支援効果を与える事ができます。
つまり、FE蒼炎・暁のスキル「恐怖」が実装できるという事です。

このスクリプトには他にも
・相手だけでなく自身にも支援効果を与える機能
・相手に取得経験値の補正をかける機能
もあります

■使い方
スキル「支援」のカスタムパラメータで
{rival_support:true}
を入れてください。

自軍・同盟軍の場合は敵軍に支援効果を、
敵軍の場合は自軍と同盟軍に支援効果を与えるようになります。

{self_support:true}
とする事で使用者のみにしなくても自身に支援効果を与える事ができるようになります

他にも
{experienceFactor: <数値>}
を入れると範囲内にいる自軍ユニットの取得経験値を <数値>/100 倍の分だけ増減させる事ができます（200と設定すれば取得量が2倍になる）


■更新履歴
ver 1.5 2017/9/3
支援適用範囲がバグっていたので修正

ver 1.4 2017/8/24
経験値支援機能を追加

ver 1.3 2017/3/12
self_support追加

ver 1.2 2016/10/31
以前のはSupportCalculatorをコピペして改変しただけだったので
変えていない部分を削りました
特に機能追加、バグ修正はしてないです

ver 1.1 2016/10/30
支援範囲を「全域」にしたスキルを自軍キャラが持っていると
出撃していなくても効果が出てしまうバグがあったので修正

■対応バージョン
SRPG Studio Version:1.144

■規約
・利用はSRPG Studioを使ったゲームに限ります。
・商用・非商用問いません。フリーです。
・加工等、問題ありません。
・クレジット明記無し　OK (明記する場合は"キュウブ"でお願いします)
・再配布、転載　OK (バグなどがあったら修正できる方はご自身で修正版を配布してもらっても構いません)
・wiki掲載　OK
・SRPG Studio利用規約は遵守してください。

--------------------------------------------------------------------------*/

(function() {

	SupportCalculator.createTotalStatus = function(unit) {
		var i, x, y, index, targetUnit, unitType, list, indexArray, count;
		var totalStatus = {};
		
		totalStatus.powerTotal = 0;
		totalStatus.defenseTotal = 0;
		totalStatus.hitTotal = 0;
		totalStatus.avoidTotal = 0;
		totalStatus.criticalTotal = 0;
		totalStatus.criticalAvoidTotal = 0;
		totalStatus.experienceFactorTotal = 100; // 経験値補正（初期値は100 = 1倍）
		
		if (this._isStatusDisabled()) {
			return totalStatus;
		}
		
		indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, this._getSupportRange());
		count = indexArray.length;
		
		// unitの一定範囲(既定3マス)にいるtargetUnitを探す
		for (i = 0; i < count; i++) {
			index = indexArray[i];
			x = CurrentMap.getX(index);
			y = CurrentMap.getY(index);
			targetUnit = PosChecker.getUnitFromPos(x, y);
			if (targetUnit !== null) {
				// targetUnitが見つかった場合は、支援データをtotalStatusに加算
				this._collectStatus(unit, targetUnit, totalStatus);
			}
		}

		unitType = unit.getUnitType();
		if (unitType === UnitType.PLAYER) {
			this._collectSkillStatus(unit, PlayerList.getSortieList(), totalStatus);
			this._collectSkillStatus(unit, EnemyList.getAliveList(), totalStatus);
			this._checkSkillStatus(unit, null, true, totalStatus);
		}
		else if (unitType === UnitType.ENEMY) {
			this._collectSkillStatus(unit, PlayerList.getSortieList(), totalStatus);
			this._collectSkillStatus(unit, EnemyList.getAliveList(), totalStatus);
			this._collectSkillStatus(unit, AllyList.getAliveList(), totalStatus);
			this._checkSkillStatus(unit, null, true, totalStatus);
		}
		else {
			this._collectSkillStatus(unit, EnemyList.getAliveList(), totalStatus);
			this._collectSkillStatus(unit, AllyList.getAliveList(), totalStatus);
			this._checkSkillStatus(unit, null, true, totalStatus);
		}
		
		return totalStatus;
	};

	SupportCalculator._collectSkillStatus = function(unit, list, totalStatus) {
		var i, targetUnit;
		var count = list.getCount();

		for (i = 0; i < count; i++) {
			targetUnit = list.getData(i);
			if (unit === targetUnit) {
				continue;
			}

			this._checkSkillStatus(targetUnit, unit, false, totalStatus);
		}
	};

	SupportCalculator._checkSkillStatus = function(unit, targetUnit, isSelf, totalStatus) {
		var i, skill, isSet, indexArray;
		var arr = SkillControl.getDirectSkillArray(unit, SkillType.SUPPORT, '');
		var count = arr.length;

		var isRival = this._isRival(unit, targetUnit);
		var rivalSupport;

		for (i = 0; i < count; i++) {
			skill = arr[i].skill;

			isSet = false;

			if (typeof skill.custom.rival_support === 'boolean') {
				rivalSupport = skill.custom.rival_support;
			} else {
				rivalSupport = false;
			}

			if (isRival !== rivalSupport) {
				continue;
			}

			if (isSelf) {
				if (skill.getRangeType() === SelectionRangeType.SELFONLY || (typeof skill.custom.self_support === 'boolean' && skill.custom.self_support)) {
					isSet = true;
				}
			}
			else {
				if (skill.getRangeType() === SelectionRangeType.ALL) {
					isSet = true;
				}
				else if (skill.getRangeType() === SelectionRangeType.MULTI) {
					// indexArray = IndexArray.getBestIndexArray(unit.getMapX(), unit.getMapY(), 1, skill.getRangeValue());
					// 「指定範囲」の場合は、indexArray内の位置にunitが存在しているか調べる
					// isSet = IndexArray.findUnit(indexArray, targetUnit);
					if (Math.abs(unit.getMapX() - targetUnit.getMapX()) + Math.abs(unit.getMapY() - targetUnit.getMapY()) <= skill.getRangeValue()) {
						isSet = true;
					} else {
						isSet = false;
					}
				}
			}

			if (isSet && this._isSupportable(unit, targetUnit, skill)) {
				this._addStatus(totalStatus, skill.getSupportStatus());
				this._customAddStatus(totalStatus, skill);
			}
		}
	};

	ExperienceCalculator._tempFunctions = [
		ExperienceCalculator._getExperienceFactor
	];

	ExperienceCalculator._getExperienceFactor = function(unit) {

		var defaultFactor = this._tempFunctions[0].call(this, unit);
		var totalStatus = SupportCalculator.createTotalStatus(unit);

		return defaultFactor + (totalStatus.experienceFactorTotal - 100) / 100;
	};

})();

SupportCalculator._customAddStatus = function(totalStatus, skill) {
	if (typeof skill.custom.experienceFactor === 'number') {
		totalStatus.experienceFactorTotal += skill.custom.experienceFactor;
	}
};

SupportCalculator._isRival = function(unit, targetUnit) {

	if (!targetUnit) {
		return false;
	}

	if (unit.getUnitType() === targetUnit.getUnitType()) {
		return false;
	} else if (unit.getUnitType() === UnitType.ENEMY || targetUnit.getUnitType() === UnitType.ENEMY) {
		return true;
	} else {
		return false;
	}
};