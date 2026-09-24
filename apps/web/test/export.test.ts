import { describe, expect, it } from 'vitest'
import { toCsv } from '../src/lib/export'

describe('toCsv', () => {
  it('writes a header and escapes commas, quotes and newlines', () => {
    expect(
      toCsv(
        ['driver', 'note', 'time'],
        [
          ['VER', 'fast, clean', 83.445],
          ['LEC', 'said "wow"\nthen', null],
        ],
      ),
    ).toBe('driver,note,time\r\nVER,"fast, clean",83.445\r\nLEC,"said ""wow""\nthen",\r\n')
  })

  it('neutralises spreadsheet formulas', () => {
    expect(toCsv(['x'], [['=1+1'], ['-2'], ['+SUM(A1)'], ['@cmd']])).toBe(
      "x\r\n'=1+1\r\n-2\r\n'+SUM(A1)\r\n'@cmd\r\n",
    )
  })
})
