import MoneyAmount from "../money-amount";

it("leaves nice amount alone", () => {
  let uut = new MoneyAmount();
  expect(uut.roundDownDisplay("12.34")).toBe("12.34");
});

it("keeps six sig figs in small amounts", () => {
  let uut = new MoneyAmount();
  expect(uut.roundDownDisplay("12.3456789")).toBe("12.3456");
  expect(uut.roundDownDisplay("-12.3456789")).toBe("-12.3456");
});

it("keeps all precision before point, leaving 1 dp on large numbers", () => {
  let uut = new MoneyAmount();
  expect(uut.roundDownDisplay("1234567.89012")).toBe("1234567.8");
  expect(uut.roundDownDisplay("-1234567.89012")).toBe("-1234567.8");
});

it("rounds down", () => {
  let uut = new MoneyAmount();
  expect(uut.roundDownDisplay("12.345699")).toBe("12.3456");
  expect(uut.roundDownDisplay("123456.799")).toBe("123456.7");
  expect(uut.roundDownDisplay("-123456.799")).toBe("-123456.7");
});

it("sensible (albeit long) for tiny numbers", () => {
  let uut = new MoneyAmount();
  expect(uut.roundDownDisplay("0.00000000000000123456789")).toBe("0.00000000000000123456");
  expect(uut.roundDownDisplay("-0.00000000000000123456789")).toBe("-0.00000000000000123456");
});

it("sensible (albeit long) for massive numbers", () => {
  let uut = new MoneyAmount();
  expect(uut.roundDownDisplay("123456789000000000")).toBe("123456789000000000");
  expect(uut.roundDownDisplay("-123456789000000000")).toBe("-123456789000000000");
});
