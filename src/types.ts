export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  dailyCalorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  sheetId?: string;
  driveConnected?: boolean;
}

export interface FoodLogEntry {
  id?: string;
  userId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  timestamp: number;
  dateStr: string;
}

export const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 70
};
