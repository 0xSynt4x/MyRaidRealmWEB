<template>
  <div class="scoring-table">
    <table>
      <thead>
        <tr>
          <th>{{ t('dice.scoringTable.combo') }}</th>
          <th>{{ t('dice.scoringTable.score') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="combo-icon">⚀</span> {{ t('dice.scoringTable.singleOne') }}</td>
          <td class="score-col">100</td>
        </tr>
        <tr>
          <td><span class="combo-icon">⚄</span> {{ t('dice.scoringTable.singleFive') }}</td>
          <td class="score-col">50</td>
        </tr>
        <tr class="separator">
          <td colspan="2"></td>
        </tr>
        <tr>
          <td><span class="combo-icon">🎯</span> {{ t('dice.scoringTable.threeOnes') }}</td>
          <td class="score-col">1000</td>
        </tr>
        <tr>
          <td><span class="combo-icon">🎲</span> {{ t('dice.scoringTable.threeOfKind') }}</td>
          <td class="score-col">X × 100</td>
        </tr>
        <tr>
          <td><span class="combo-icon">🎲</span> {{ t('dice.scoringTable.fourOfKind') }}</td>
          <td class="score-col">{{ t('dice.scoringTable.threeOfKindTimes2') }}</td>
        </tr>
        <tr>
          <td><span class="combo-icon">🎲</span> {{ t('dice.scoringTable.fiveOfKind') }}</td>
          <td class="score-col">{{ t('dice.scoringTable.threeOfKindTimes4') }}</td>
        </tr>
        <tr>
          <td><span class="combo-icon">🎲</span> {{ t('dice.scoringTable.sixOfKind') }}</td>
          <td class="score-col">{{ t('dice.scoringTable.threeOfKindTimes8') }}</td>
        </tr>
        <tr class="separator">
          <td colspan="2"></td>
        </tr>
        <tr class="special-row">
          <td><span class="combo-icon">🌈</span> {{ t('dice.scoringTable.straight') }}</td>
          <td class="score-col">1500</td>
        </tr>
        <tr class="special-row">
          <td><span class="combo-icon">👯</span> {{ t('dice.scoringTable.threePairs') }}</td>
          <td class="score-col">1500</td>
        </tr>
        <tr class="special-row">
          <td><span class="combo-icon">🏆</span> {{ t('dice.scoringTable.twoTriplets') }}</td>
          <td class="score-col">2500</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n';

const { t } = useI18n();
</script>

<style scoped>
.scoring-table {
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

thead th {
  text-align: left;
  font-size: calc(var(--text-xs) - 1px);
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border-light);
}

thead th:last-child {
  text-align: right;
}

tbody td {
  padding: 3px 6px;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.combo-icon {
  font-size: var(--text-sm);
  margin-right: 2px;
}

.score-col {
  text-align: right;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--accent-success);
  white-space: nowrap;
}

.separator td {
  padding: 2px 0;
  border-bottom: 1px dashed var(--border-light);
}

.special-row td {
  color: var(--text-primary);
  font-weight: 500;
}

.special-row .score-col {
  color: var(--accent-warning);
}
</style>
