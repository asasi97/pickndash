import csv
import itertools
import math

data = [x for x in csv.reader(open('receipts.csv'))]

del data[0]
del data[0]

data2 = []
itemDict = {}
for x in data:
    aList = []
    for y in x[1:]:
        if y != '':
            if y not in itemDict:
                itemDict[y] = 1
            else:
                itemDict[y] += 1
            aList.append(y)
    data2.append(aList)

N = len(data2)

combinationDict = {}
for receipt in data2:

    combinations = [x for x in itertools.combinations(receipt, 2)]
    for combination in combinations:
        if combination not in combinationDict:
            combinationDict[combination] = 1
        else:
            combinationDict[combination] += 1

for combination in combinationDict:
    if combinationDict[combination]/N > 0.01:
        #mutualInformation.append([combination, math.log10((combinationDict[combination])/((itemDict[combination[0]]/N)*(itemDict[combination[1]]/N)))])
        mutualInformation.append([combination, (combinationDict[combination]/N)*math.log10(combinationDict[combination]*N/(itemDict[combination[0]]*itemDict[combination[1]]))])

mutualInformation.sort(key=lambda x: x[1], reverse=True)
file = open("mutualInformation.csv", 'w')
writer = csv.writer(file)
writer.writerow(['Combination', 'Factor'])
for i in mutualInformation:
    writer.writerow(i)


