import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

export default function ReadFile() {
    const handleFileUpload = e => {
        const [file] = e.target.files;
        if (file) {
            const reader = new FileReader();
            reader.addEventListener("loadend", function() {
                jsonArrayToHierarchy(
                    convertToTidyJsonArray(
                        removeAuthorLines(
                            reader.result
                        )
                    )
                );
                // console.log(removeAuthorLines(reader.result)); // will print out file content
            });
            reader.readAsText(file);
        }
    };

    const removeAuthorLines = (textData) => {
        var rowsArray = textData.split("\n");
        for (var i=0; i<10; i++){
            rowsArray.shift();
        }
        return rowsArray;
    }
    const getRandomColor = () => {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
      }

    const convertToTidyJsonArray = (jsonArray) => {
        let columnLabels = jsonArray[0].split(",");
        let tidyData = []
        let categories = new Set();
        for (let i=1; i<jsonArray.length; i++){
            let tidyRow = {}
            let rowArray = jsonArray[i].split(",");
            for (let j=0; j<rowArray.length; j++){
                tidyRow[columnLabels[j]] = rowArray[j];
                // Consider AS/2/LABEL as a categorical variable and color the data based on these values.
                if(columnLabels[j] == "AS/2/LABEL"){
                    categories.add(rowArray[j]);
                }
            }
            tidyData.push(tidyRow);
        }
        let catToColor = {}
        categories = Array.from(categories);
        for (let i=0; i<categories.length; i++){
            catToColor[categories[i]] = getRandomColor();
        }

        for(let i=0; i<tidyData.length; i++){
            let label_2 = tidyData[i]["AS/2/LABEL"];
            tidyData[i]["color"] = catToColor[label_2];
        }
        console.log("Colored data is: ", tidyData);
        return tidyData
    }

    const jsonArrayToHierarchy = (tidyColoredData) => {
        let columnNames = Array.from(Object.keys(tidyColoredData[0]));
        const idRegExp = new RegExp("AS\/[0-9]*\/ID");
        const ctIdRegExp = new RegExp("CT\/1\/ID");
        let hierarchicalColumns = columnNames
                .filter(colName => idRegExp.test(colName) || ctIdRegExp.test(colName));
        console.log(hierarchicalColumns);
        let dataMapping = []
        for (let i=0; i<tidyColoredData.length; i++) {
            let row = tidyColoredData[i];
            let parentId = "";
            let parentName = "";
            let mapping = {};
            for (let j=0; j<hierarchicalColumns.length; j++){
                let colName = hierarchicalColumns[j];
                let idArray = colName.split("/");
                let labelColName = idArray[0] + "/" + idArray[1] + "/" + "LABEL";
                if(row[colName] != "" && parentName != row[colName]){
                    mapping = {
                        "childId" : row[colName],
                        "parentId": parentId,
                        "childLabel": row[labelColName],
                        "parentLabel": parentName
                    }
                    parentId = row[colName];
                    parentName = row[labelColName];
                    dataMapping.push(mapping);
                }
            }
        }
        var cleanMapping = dataMapping.filter((arr, index, self) =>
            index === self.findIndex((t) => (t.childId === arr.childId && t.parentId === arr.parentId)))
        console.log(cleanMapping);
        return cleanMapping;
    }

    return (
        <div>
            <h1>Trust yourself.</h1>
            <input type="file" multiple={false} onChange={handleFileUpload}/>
        </div>
    );
}