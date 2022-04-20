import numpy as np
import pandas as pd
import sys


if __name__ == "__main__":
    source_file_path, dest_file_path = sys.argv[1], sys.argv[2]
    data = pd.read_csv(source_file_path)
    current_colnames = list(data.columns)
    new_colnames = list(data.iloc[9, :])
    data = data.iloc[10:, :]
    data.rename(columns = {curr: new_names for curr, new_names in zip(current_colnames, new_colnames)}, 
                inplace=True)
    data.reset_index(inplace=True)
    data.drop("index", axis=1, inplace=True)
    data["root"] = "Root"
    # data.replace(np.nan, None, inplace=True)
    data.to_csv(dest_file_path)