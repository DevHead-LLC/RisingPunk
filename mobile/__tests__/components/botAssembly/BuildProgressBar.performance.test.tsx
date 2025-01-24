import { render } from "@testing-library/react-native";
import { BuildProgressBar } from "../../../src/components/botAssembly/BuildProgressBar";

describe('BuildProgressBar Performance', () => {
  it('should smoothly animate progress updates', () => {
    const { rerender, getByTestId } = render(<BuildProgressBar progress={0} />);
    
    // Simulate progress updates
    for (let i = 0; i <= 100; i += 10) {
      rerender(<BuildProgressBar progress={i} />);
      const progressFill = getByTestId('progress-fill');
      expect(progressFill.props.style.transform).toBeDefined();
    }
  });
}); 