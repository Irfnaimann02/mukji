import { Restaurant, SEED_RESTAURANTS } from './restaurants';

export function getAllRestaurants(): Restaurant[] {
    return SEED_RESTAURANTS;
}