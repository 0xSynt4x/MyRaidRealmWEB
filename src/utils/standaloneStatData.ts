export {
  clearStandaloneCurrentStatData as clearStandaloneStatData,
  getStandaloneCurrentStatDataStorageKey as getStandaloneStatDataStorageKey,
  readStandaloneCurrentStatData as loadStandaloneStatData,
  seedStandaloneCurrentStatData as seedStandaloneStatData,
  writeStandaloneCurrentStatData as persistStandaloneStatData,
  type StandaloneCurrentStatData as StandaloneStatData,
} from '../../runtime/standaloneState';
