import GradeScale, { findScoreRange, getAvgScore, GradeScales, Tuple } from '../GradeScale'
import boulder from '../data/boulder.json'
import { Boulder } from '.'
import { boulderScoreToBand, GradeBandTypes } from '../GradeBands'

const uiaaGradeRegex = /^(\d{1,2}[\+\-]?)|\d{1,2}$/
// UIAA grading system, predominant in Central Europe (esp. Germany, Austria, Switzerland)
// Uses Arabic numerals with +/- signs, e.g. "7", "7-" (easier), or "7+" (harder)
// (Sometimes roman numerals, e. g. "VII", are used - this is not supported)

const UIAAScale: GradeScale = {
  displayName: 'UIAA Scale',
  name: GradeScales.UIAA,
  offset: 1000, // TODO: what is this?
  allowableConversionType: [GradeScales.UIAA], // TODO: what is this?
  isType: (grade: string): boolean => {
    const isUIAAGrade = grade.match(uiaaGradeRegex) !== null
    // If there isn't a match sort it to the bottom
    if (isUIAAGrade === null) {
      return false
    }
    return true
  },
  // TODO: what is this? seems to return normalised score for a grade
  getScore: (grade: string): number | Tuple => {
    return getScore(grade)
  },
  getGrade: (score: number | Tuple): string => {
    function validateScore (score: number): number {
      const validScore = Number.isInteger(score) ? score : Math.ceil(score)
      return Math.min(Math.max(0, validScore), boulder.length - 1)
    }

    if (typeof score === 'number') {
      return boulder[validateScore(score)].v
    }

    const low: string = boulder[validateScore(score[0])].v
    const high: string = boulder[validateScore(score[1])].v
    if (low === high) return low
    return `${low}-${high}`
  },
  getGradeBand: (grade: string): GradeBandTypes => {
    const score = getScore(grade)
    return boulderScoreToBand(getAvgScore(score))
  }
}

export default UIAAScale

export const getScoreIrregular = (irregularMatch: RegExpMatchArray): number => {
  let score = 0
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [_, group] = irregularMatch
  switch (group) {
    case 'easy':
      score = 1
      break
    default:
      score = 0
      break
  }
  return score
}

export const getScoreCommon = (match: RegExpMatchArray): number => {
  let score = 0
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [_, num, hasPlus, hasMinus, secondNumber] = match
  const minus = hasMinus !== undefined && secondNumber === undefined ? -1 : 0 // check minus is not a V1-2
  const plus =
    (hasMinus !== undefined && secondNumber !== undefined) || hasPlus !== undefined ? 1 : 0 // grade V1+ the same as V1-2
  score = (parseInt(num, 10) + 1) * 10 + minus + plus // V0 = 10, leave room for V-easy to be below 0

  return score
}

const getScore = (grade: string): number | Tuple => {
  const parse = grade.match(uiaaGradeRegex)
  if (parse == null) {
    // not a valid UIAA scale
    console.warn(`Unexpected grade format: ${grade} for grade scale UIAA scale`)
    return -1
  }
  const [wholeMatch, basicGrade, plus, dash, secondGrade] = parse

  const basicScore = findScoreRange(
    (r: Boulder) => r.v.toLowerCase() === basicGrade.toLowerCase(),
    boulder
  )
  // ugly but working will fix later (says ever dev ever)
  if (wholeMatch !== basicGrade) {
    let otherGrade
    // V5+, V2-3
    if (plus !== undefined || secondGrade !== undefined) {
      otherGrade = (typeof basicScore === 'number' ? basicScore : basicScore[1]) + 1
    } else if (dash !== undefined) {
      // V5-, V2-
      otherGrade = (typeof basicScore === 'number' ? basicScore : basicScore[0]) - 1
    }
    if (otherGrade !== undefined) {
      const nextGrade = findScoreRange(
        (r: Boulder) => r.v.toLowerCase() === boulder[otherGrade].v.toLowerCase(),
        boulder
      )
      return [getAvgScore(basicScore), getAvgScore(nextGrade)].sort((a, b) => a - b) as Tuple
    }
  }
  return basicScore
}
