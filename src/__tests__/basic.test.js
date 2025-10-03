// Basic test to verify testing setup works
describe('Basic Test Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true)
  })

  it('should handle basic JavaScript operations', () => {
    const sum = (a, b) => a + b
    expect(sum(2, 3)).toBe(5)
  })

  it('should handle async operations', async () => {
    const asyncFunction = () => Promise.resolve('success')
    const result = await asyncFunction()
    expect(result).toBe('success')
  })

  it('should handle object operations', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj).toHaveProperty('name', 'test')
    expect(obj).toHaveProperty('value', 42)
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(arr).toHaveLength(5)
    expect(arr).toContain(3)
    expect(arr.filter(x => x > 3)).toEqual([4, 5])
  })
})