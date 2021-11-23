import { std, sum } from "mathjs";

export function getMonthIdentifier(monthDiff: number = 0) {
    let d = new Date();
    d.setMonth(d.getMonth() + monthDiff);
    return d
        .toLocaleString("en-US", { month: "short", year: "2-digit" })
        .replace(/ /g, "-");
}

export function withinLastMonth(date: string) {
    const baseDate = new Date(date);
    let d = new Date();
    d.setMonth(d.getMonth() - 1);
    return baseDate > d;
}

export function getFirstDayOfMonth(monthDiff: number = 0) {
    let date = new Date();
    date.setMonth(date.getMonth() + monthDiff);
    const twoDigitMonth =
        date.getMonth() < 9 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    return `${date.getFullYear()}-${twoDigitMonth}-01`;
}

export function getLastDayOfMonth(monthDiff: number = 0) {
    let date = new Date();
    date.setMonth(date.getMonth() + monthDiff);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const twoDigitMonth =
        lastDay.getMonth() < 9 ? `0${lastDay.getMonth() + 1}` : lastDay.getMonth() + 1;
    return `${lastDay.getFullYear()}-${twoDigitMonth}-${lastDay.getDate()}`;
}

export function zScore(current: number, old: number[]) {
    const count = old.length;
    const avg = sum(old) / count;

    if (count === 1) {
        return current - avg;
    }

    const score = (current - avg) / std(old);
    if (!score) {
        return 0;
    }
    return score;
}


export function arraySum(summands: number[]) {
    function add(accumulator: number, a: number) {
        return accumulator + a;
    }
    return summands.reduce(add, 0);
}