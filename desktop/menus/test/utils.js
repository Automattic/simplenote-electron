import { buildRadioGroup } from "../utils";

describe("Menu Utils", () => {
  describe("buildRadioGroup", () => {
    const menuItems = [
      {
        id: "myValue",
        passThroughProp: "passThroughValue",
      },
      {
        id: "myUnselectedValue",
      },
    ];
    const args = {
      action: "myAction",
      propName: "myProp",
      settings: { myProp: "myValue" },
    };
    const result = menuItems.map(buildRadioGroup(args));

    test("should pass through any props", () => {
      expect(result[0].passThroughProp).toBe("passThroughValue");
    });

    test('should set the correct item as "checked"', () => {
      expect(result[0].checked).toBe(true);
      expect(result[1].checked).toBe(false);
    });
  });
});
